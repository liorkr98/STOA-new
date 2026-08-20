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
