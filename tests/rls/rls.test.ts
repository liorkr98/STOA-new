/**
 * Automated RLS regression tests (Scale-Hardening Section 7). A manually
 * reviewed policy silently regresses when a later migration touches the same
 * table. These tests authenticate as anon / owner / other-user / admin and
 * assert specific rows and actions are correctly allowed or blocked, so a
 * regression fails CI on the schema change that caused it.
 *
 * Run: `npm run test:rls`. Requires NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and seeded demo
 * users. When env is absent the suite skips cleanly (so CI without secrets is
 * green rather than red-for-the-wrong-reason).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.RLS_TEST_PASSWORD ?? "stoademo123";

const configured = Boolean(URL && ANON && SERVICE);
const skip = configured ? false : "Supabase env not set - skipping RLS suite";

function anonClient(): SupabaseClient {
  return createClient(URL!, ANON!, { auth: { persistSession: false } });
}

function adminClient(): SupabaseClient {
  return createClient(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(email: string): Promise<SupabaseClient | null> {
  const client = createClient(URL!, ANON!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) return null;
  return client;
}

test("anon cannot read admin-only tables", { skip }, async () => {
  const anon = anonClient();
  for (const table of ["audit_log", "deletion_requests", "contact_messages"]) {
    const { data } = await anon.from(table).select("*").limit(1);
    assert.deepEqual(data ?? [], [], `anon must not read ${table}`);
  }
});

test("anon cannot read a paid report body", { skip }, async () => {
  const admin = adminClient();
  const { data: paid } = await admin
    .from("reports")
    .select("id")
    .eq("access", "paid")
    .eq("status", "published")
    .limit(1);
  if (!paid || paid.length === 0) return; // nothing to assert against

  const reportId = paid[0]!.id;
  const anon = anonClient();
  const { data } = await anon.from("report_bodies").select("report_id").eq("report_id", reportId);
  assert.deepEqual(data ?? [], [], "anon must not read a paid report body");
});

test("a signed-in non-owner cannot read another user's wallet transactions", { skip }, async () => {
  const investor = await signIn("investor@stoa.demo");
  if (!investor) return;

  const admin = adminClient();
  const { data: others } = await admin
    .from("wallet_transactions")
    .select("owner_id")
    .limit(50);
  const { data: me } = await investor.auth.getUser();
  const foreign = (others ?? []).find((r) => r.owner_id !== me.user?.id);
  if (!foreign) return;

  const { data } = await investor
    .from("wallet_transactions")
    .select("owner_id")
    .eq("owner_id", foreign.owner_id);
  assert.deepEqual(data ?? [], [], "must not read another user's wallet transactions");
});

test("a client cannot UPDATE a prediction (no update policy)", { skip }, async () => {
  const analyst = await signIn("marcus_webb@stoa.demo");
  if (!analyst) return;

  const admin = adminClient();
  const { data: preds } = await admin.from("predictions").select("id").limit(1);
  if (!preds || preds.length === 0) return;

  const { data, error } = await analyst
    .from("predictions")
    .update({ outcome: "hit" })
    .eq("id", preds[0]!.id)
    .select();
  // RLS blocks the row: either an explicit error or zero rows affected.
  assert.ok(error != null || (data ?? []).length === 0, "prediction update must be blocked");
});

test("anon cannot execute privileged SECURITY DEFINER functions", { skip }, async () => {
  const anon = anonClient();
  for (const fn of ["pseudonymize_user", "purge_all_except_email", "top_up", "upsert_paypal_account"]) {
    const { error } = await anon.rpc(fn as never, {});
    assert.ok(error, `${fn} must not be executable by anon`);
  }
});

test("a signed-in user cannot read another user's paypal_accounts", { skip }, async () => {
  const investor = await signIn("investor@stoa.demo");
  if (!investor) return;

  const admin = adminClient();
  const { data: me } = await investor.auth.getUser();
  const { data: foreign } = await admin
    .from("paypal_accounts")
    .select("user_id")
    .neq("user_id", me.user?.id ?? "")
    .limit(1);
  if (!foreign || foreign.length === 0) return;

  const { data } = await investor.from("paypal_accounts").select("user_id").eq("user_id", foreign[0]!.user_id);
  assert.deepEqual(data ?? [], [], "must not read another user's PayPal row");
});

test("a locked report ticker cannot be rewritten by the author", { skip }, async () => {
  const analyst = await signIn("marcus_webb@stoa.demo");
  if (!analyst) return;

  const { data: locked } = await analyst
    .from("reports")
    .select("id, ticker, locked_at")
    .not("locked_at", "is", null)
    .eq("author_id", (await analyst.auth.getUser()).data.user?.id ?? "")
    .limit(1);
  if (!locked || locked.length === 0) return;

  const { data, error } = await analyst
    .from("reports")
    .update({ ticker: "ZZZZ" })
    .eq("id", locked[0]!.id)
    .select("ticker");
  assert.ok(
    error != null || (data ?? []).length === 0 || data?.[0]?.ticker === locked[0]!.ticker,
    "locked ticker must stay frozen",
  );
});

test("a user can insert their own deletion request and cannot approve it", { skip }, async () => {
  const investor = await signIn("investor@stoa.demo");
  if (!investor) return;
  const { data: me } = await investor.auth.getUser();
  if (!me.user) return;

  const { error: insertError } = await investor.from("deletion_requests").insert({
    user_id: me.user.id,
    status: "pending",
  });
  // Unique pending index may already have a row from a previous run.
  assert.ok(insertError == null || insertError.code === "23505", insertError?.message ?? "insert failed");

  const { error: rpcError } = await investor.rpc("approve_deletion_request", {
    p_request_id: "00000000-0000-0000-0000-000000000000",
    p_admin_id: me.user.id,
  });
  assert.ok(rpcError, "approve_deletion_request must not be executable by a non-admin client");
});

test("a signed-in non-buyer cannot read a paid report body", { skip }, async () => {
  const investor = await signIn("investor@stoa.demo");
  if (!investor) return;
  const { data: me } = await investor.auth.getUser();
  if (!me.user) return;

  const admin = adminClient();
  const { data: paid } = await admin
    .from("reports")
    .select("id")
    .eq("access", "paid")
    .eq("status", "published")
    .neq("author_id", me.user.id)
    .limit(20);
  if (!paid || paid.length === 0) return;

  const { data: unlocks } = await admin
    .from("report_unlocks")
    .select("report_id")
    .eq("user_id", me.user.id);
  const unlocked = new Set((unlocks ?? []).map((u) => u.report_id));
  const lockedPaid = paid.find((r) => !unlocked.has(r.id));
  if (!lockedPaid) return;

  const { data } = await investor.from("report_bodies").select("report_id").eq("report_id", lockedPaid.id);
  assert.deepEqual(data ?? [], [], "non-buyer must not read a paid report body");
});

test("a stranger cannot read another creator's video_view_events", { skip }, async () => {
  const investor = await signIn("investor@stoa.demo");
  if (!investor) return;
  const { data: me } = await investor.auth.getUser();
  if (!me.user) return;

  const admin = adminClient();
  const { data: foreignClips } = await admin
    .from("video_clips")
    .select("id")
    .neq("creator_id", me.user.id)
    .limit(5);
  if (!foreignClips || foreignClips.length === 0) return;

  const { data } = await investor
    .from("video_view_events")
    .select("video_id")
    .eq("video_id", foreignClips[0]!.id)
    .limit(5);
  assert.deepEqual(data ?? [], [], "must not read another creator's view events");
});

test("a signed-in user cannot read another user's notifications", { skip }, async () => {
  const investor = await signIn("investor@stoa.demo");
  if (!investor) return;

  const admin = adminClient();
  const { data: me } = await investor.auth.getUser();
  const { data: foreign } = await admin
    .from("notifications")
    .select("id, recipient_id")
    .neq("recipient_id", me.user?.id ?? "")
    .limit(1);
  if (!foreign || foreign.length === 0) return;

  const { data } = await investor
    .from("notifications")
    .select("id")
    .eq("id", foreign[0]!.id);
  assert.deepEqual(data ?? [], [], "must not read another user's notifications");
});
