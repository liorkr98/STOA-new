import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { listDemoUsers } from "./demo-data";

/**
 * Read-only inventory of everything scoped to @stoa.demo. Touches nothing.
 * Run this before seeding or tearing down to see what already exists and which
 * demo logins have actually been used.
 *
 * Run: npm run demo:inventory
 */

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("your-project-ref") || key.startsWith("your-")) {
    throw new Error("Supabase credentials are not set in .env.local.");
  }
  console.log(`Target: ${new URL(url).host}\n`);

  const db = createClient(url, key, { auth: { persistSession: false } });
  const demo = await listDemoUsers(db);

  if (demo.length === 0) {
    console.log("No @stoa.demo accounts exist. Nothing to lose, nothing stale.");
    return;
  }

  const ids = demo.map((u) => u.id);
  const { data: profiles } = await db.from("profiles").select("id, handle, display_name, role, created_at").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const rows: { email: string; handle: string; role: string; pubs: number; calls: number; lastSignIn: string }[] = [];
  let totalPubs = 0;
  let totalCalls = 0;

  for (const u of demo) {
    const { count: pubs } = await db.from("reports").select("id", { count: "exact", head: true }).eq("author_id", u.id);
    const { count: calls } = await db.from("predictions").select("id", { count: "exact", head: true }).eq("author_id", u.id);
    const p = byId.get(u.id);
    totalPubs += pubs ?? 0;
    totalCalls += calls ?? 0;
    rows.push({
      email: u.email,
      handle: (p?.handle as string) ?? "(no profile)",
      role: (p?.role as string) ?? "?",
      pubs: pubs ?? 0,
      calls: calls ?? 0,
      lastSignIn: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString().slice(0, 10) : "never",
    });
  }

  rows.sort((a, b) => (a.lastSignIn === "never" ? 1 : 0) - (b.lastSignIn === "never" ? 1 : 0) || b.pubs - a.pubs);

  console.log(`${demo.length} @stoa.demo accounts, ${totalPubs} publications, ${totalCalls} calls.\n`);
  console.log("email".padEnd(34) + "handle".padEnd(20) + "role".padEnd(9) + "pubs".padStart(5) + "calls".padStart(7) + "  last sign-in");
  console.log("-".repeat(92));
  for (const r of rows) {
    console.log(
      r.email.padEnd(34) + r.handle.padEnd(20) + r.role.padEnd(9) + String(r.pubs).padStart(5) + String(r.calls).padStart(7) + "  " + r.lastSignIn,
    );
  }

  const used = rows.filter((r) => r.lastSignIn !== "never");
  console.log(`\n${used.length} of these have been signed into at least once:`);
  for (const r of used) console.log(`  ${r.email} (last ${r.lastSignIn})`);

  const { data: clips } = await db.from("video_clips").select("bunny_video_guid, creator_id").in("creator_id", ids);
  console.log(`\nBunny video assets attached to demo accounts: ${clips?.length ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
