import "./load-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { listDemoUsers } from "./demo-data";

/**
 * Removes the demo dataset in one command: Bunny video assets first, then every
 * row, then the accounts themselves.
 *
 * How complete that is depends on the database. purge_demo_author cannot delete
 * a locked report until its guard gains the escape hatch the prediction guard
 * already has, so on an unpatched database this archives instead: hidden from
 * every reader by RLS, still present in the tables. The script says which it
 * did rather than reporting success either way.
 *
 * Scoped strictly to @stoa.demo. `purge_demo_author` refuses any other account,
 * so a mistake here cannot reach a real user's content.
 *
 * Bunny is called over the API directly rather than through src/lib/video/bunny.ts,
 * which is marked server-only and cannot be imported from a script.
 *
 * Run: npm run demo:teardown
 * Dry run: npm run demo:teardown -- --dry-run
 */

const BUNNY_API = "https://video.bunnycdn.com/library";

async function deleteBunnyVideo(guid: string): Promise<"deleted" | "missing" | "failed"> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  if (!libraryId || !apiKey) return "failed";
  const res = await fetch(`${BUNNY_API}/${libraryId}/videos/${guid}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey, accept: "application/json" },
  });
  if (res.status === 404) return "missing";
  return res.ok ? "deleted" : "failed";
}

async function clearTable(db: SupabaseClient, table: string, column: string, ids: string[]) {
  const { error, count } = await db.from(table).delete({ count: "exact" }).in(column, ids);
  if (error) {
    console.error(`  ${table}: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("your-project-ref") || key.startsWith("your-")) {
    throw new Error("Supabase credentials are not set in .env.local.");
  }
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Target: ${new URL(url).host}${dryRun ? "  (dry run, nothing will be deleted)" : ""}\n`);

  const db = createClient(url, key, { auth: { persistSession: false } });
  const demo = await listDemoUsers(db);

  if (demo.length === 0) {
    console.log("No @stoa.demo accounts found. Nothing to remove.");
    return;
  }
  const ids = demo.map((u) => u.id);
  console.log(`${demo.length} demo accounts in scope.`);

  const { data: clips } = await db.from("video_clips").select("id, bunny_video_guid").in("creator_id", ids);
  const { data: assets } = await db.from("video_assets").select("id, bunny_video_guid").in("creator_id", ids);
  const guids = [
    ...new Set(
      [...(clips ?? []), ...(assets ?? [])]
        .map((r) => (r as { bunny_video_guid: string | null }).bunny_video_guid)
        .filter((g): g is string => Boolean(g)),
    ),
  ];
  console.log(`${guids.length} Bunny video assets attached to them.`);

  if (dryRun) {
    const { count: pubs } = await db.from("reports").select("id", { count: "exact", head: true }).in("author_id", ids);
    const { count: calls } = await db.from("predictions").select("id", { count: "exact", head: true }).in("author_id", ids);
    console.log(`\nWould remove: ${pubs ?? 0} publications, ${calls ?? 0} calls, ${guids.length} Bunny videos, ${demo.length} accounts.`);
    for (const u of demo) console.log(`  ${u.email}`);
    return;
  }

  if (guids.length > 0) {
    let deleted = 0;
    let missing = 0;
    let failed = 0;
    for (const guid of guids) {
      const outcome = await deleteBunnyVideo(guid);
      if (outcome === "deleted") deleted++;
      else if (outcome === "missing") missing++;
      else {
        failed++;
        console.error(`  Bunny delete failed for ${guid}`);
      }
    }
    console.log(`Bunny: ${deleted} deleted, ${missing} already gone, ${failed} failed.`);
    if (failed > 0) {
      throw new Error(
        `${failed} Bunny asset(s) could not be deleted. Stopping before the database rows that reference them are removed, so nothing is orphaned. Check BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY, then re-run.`,
      );
    }
  }

  // purge_demo_author cannot delete a locked report until the guard gains the
  // escape hatch its prediction counterpart already has. Detect which world we
  // are in from the first account rather than assuming, then say so plainly at
  // the end: archiving hides demo content, it does not remove it.
  console.log("Clearing content...");
  let canDelete = true;
  let purged = 0;
  let archived = 0;
  for (const u of demo) {
    if (canDelete) {
      const { error } = await db.rpc("purge_demo_author", { p_author_id: u.id });
      if (!error) {
        purged++;
        continue;
      }
      if (!error.message.includes("Locked reports cannot be deleted")) {
        console.error(`  ${u.email}: ${error.message}`);
        continue;
      }
      canDelete = false;
      console.log("  purge_demo_author cannot delete locked reports on this database.");
      console.log("  Falling back to archiving. See docs/BACKEND_BRIEF.md for the migration that fixes this.");
    }
    const { data, error } = await db
      .from("reports")
      .update({ status: "archived" })
      .eq("author_id", u.id)
      .in("status", ["published", "resolution_pending_review", "draft"])
      .select("id");
    if (error) console.error(`  could not archive ${u.email}: ${error.message}`);
    else archived += data?.length ?? 0;
  }
  if (purged > 0) console.log(`  purged ${purged} accounts' content.`);
  if (archived > 0) console.log(`  archived ${archived} publications (hidden from readers, still in the tables).`);

  const follows = (await clearTable(db, "follows", "follower_id", ids)) + (await clearTable(db, "follows", "analyst_id", ids));
  const subs = (await clearTable(db, "subscriptions", "subscriber_id", ids)) + (await clearTable(db, "subscriptions", "analyst_id", ids));
  const comments = await clearTable(db, "comments", "author_id", ids);
  const snapshots = await clearTable(db, "moat_score_snapshots", "creator_id", ids);
  console.log(`Cleared ${follows} follows, ${subs} subscriptions, ${comments} comments, ${snapshots} score snapshots.`);

  // Deleting the account cascades into reports, which trips the same guard, so
  // this only succeeds once the content is genuinely gone.
  console.log("Removing accounts...");
  let removed = 0;
  let kept = 0;
  for (const u of demo) {
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) {
      kept++;
      if (canDelete) console.error(`  ${u.email}: ${error.message}`);
    } else removed++;
  }

  if (canDelete && kept === 0) {
    console.log(`\nRemoved ${removed} demo accounts and everything attached to them.`);
  } else {
    console.log(`\nPartial teardown. Removed ${removed} accounts; ${kept} could not be removed.`);
    console.log("Their publications are archived and hidden from every reader, but the rows remain.");
    console.log("This conceals the demo dataset, it does not delete it. Full removal needs the");
    console.log("purge_demo_author migration described in docs/BACKEND_BRIEF.md.");
  }
  console.log("Verify with: npm run demo:inventory");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
