import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { refreshTickerMetrics } from "../src/lib/engine/refresh-ticker-metrics";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  const db = admin();
  let offset = 0;
  let totalUpdated = 0;
  let pass = 0;

  while (pass < 200) {
    pass += 1;
    const result = await refreshTickerMetrics(db, { offset, maxBatches: 100 });
    totalUpdated += result.updated;
    console.log(
      `Pass ${pass}: processed=${result.processed} updated=${result.updated} skipped=${result.skipped} errors=${result.errors} finished=${result.finished}`,
    );
    if (result.finished) break;
    offset = result.nextOffset;
  }

  console.log(`Done. Total rows updated this run: ${totalUpdated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
