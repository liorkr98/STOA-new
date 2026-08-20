import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { recomputeAllScores } from "../src/lib/engine/recompute";

/**
 * Recompute every analyst's Track Score from stored history under the current
 * formula. Dry-run by default; pass --commit to actually rewrite scores.
 *
 *   npm run recompute:scores            # dry run, prints what would change
 *   npm run recompute:scores -- --commit  # rewrite profiles + snapshots
 */
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  }
  const commit = process.argv.includes("--commit");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const summary = await recomputeAllScores(db, { commit });

  console.log(`Formula version: ${summary.formulaVersion}`);
  console.log(`Analysts: ${summary.analysts}  |  Scores ${commit ? "changed" : "that would change"}: ${summary.changed}`);
  for (const it of summary.items) {
    const delta =
      it.previousScore === it.result.score
        ? `${it.result.score} (unchanged)`
        : `${it.previousScore ?? "-"} -> ${it.result.score}`;
    console.log(`  ${it.authorId}  score ${delta}  (n=${it.result.total})`);
  }
  console.log(
    commit
      ? `Committed: rewrote ${summary.analysts} analysts and inserted fresh snapshots.`
      : `Dry run — no writes. Re-run with --commit to apply.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
