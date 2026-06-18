import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { gradeDuePredictions } from "../src/lib/engine/grade";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const summary = await gradeDuePredictions(db);
  console.log(
    `Graded ${summary.graded} predictions, updated ${summary.analystsUpdated} analysts, expired ${summary.subscriptionsExpired} subscriptions.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
