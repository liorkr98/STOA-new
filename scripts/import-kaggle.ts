import "./load-env";
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { basename, join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Imports Kaggle datasets into Supabase reference tables:
 * - finnhub/reported-financials  -> company_financials
 * - finnhub/sp-500-futures-tick-data-sp -> sp_benchmark_bars (aggregated)
 *
 * Setup:
 *   1. pip install kaggle  (or place extracted files in data/kaggle/)
 *   2. Set KAGGLE_USERNAME + KAGGLE_KEY in .env.local, or download manually
 *   3. npm run import:kaggle
 */

const DATA_ROOT = resolve(process.cwd(), "data/kaggle");

const FINANCIALS_DATASET = "finnhub/reported-financials";
const SP_FUTURES_DATASET = "finnhub/sp-500-futures-tick-data-sp";

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function ensureDir(path: string) {
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Run with Kaggle credentials or download datasets manually:\n` +
        `  https://www.kaggle.com/datasets/${FINANCIALS_DATASET}\n` +
        `  https://www.kaggle.com/datasets/${SP_FUTURES_DATASET}`,
    );
  }
}

function tryKaggleDownload(dataset: string, dest: string) {
  if (existsSync(dest) && readdirSync(dest).length > 0) return;
  const user = process.env.KAGGLE_USERNAME;
  const key = process.env.KAGGLE_KEY;
  if (!user || !key) return;

  mkdirSync(dest, { recursive: true });
  try {
    execSync(`kaggle datasets download -d ${dataset} -p "${dest}" --unzip`, {
      stdio: "inherit",
      env: { ...process.env, KAGGLE_USERNAME: user, KAGGLE_KEY: key },
    });
  } catch {
    console.warn(`Kaggle CLI download failed for ${dataset}. Place files in ${dest} manually.`);
  }
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickLineItem(report: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = report[key];
    if (typeof v === "number") return v;
    if (typeof v === "string") return num(v);
    if (v && typeof v === "object" && "value" in (v as object)) {
      return num((v as { value: unknown }).value);
    }
  }
  return null;
}

async function importFinancialsFile(db: SupabaseClient, filePath: string) {
  const raw = readFileSync(filePath, "utf8");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.warn(`Skip non-JSON: ${filePath}`);
    return 0;
  }

  const records = Array.isArray(payload) ? payload : [payload];
  let count = 0;

  for (const rec of records) {
    if (!rec || typeof rec !== "object") continue;
    const row = rec as Record<string, unknown>;
    const symbol = String(row.symbol ?? "").toUpperCase();
    if (!symbol) continue;

    const filings = Array.isArray(row.data) ? row.data : [];
    for (const filing of filings) {
      if (!filing || typeof filing !== "object") continue;
      const f = filing as Record<string, unknown>;
      const periodEnd = String(f.endDate ?? f.period_end ?? f.reportDate ?? "").slice(0, 10);
      if (!periodEnd) continue;

      const freqRaw = String(f.freq ?? f.frequency ?? "annual").toLowerCase();
      const frequency = freqRaw.startsWith("q") ? "quarterly" : "annual";
      const report = (f.report ?? f.financials ?? f) as Record<string, unknown>;

      const { error } = await db.from("company_financials").upsert(
        {
          symbol,
          cik: row.cik ? String(row.cik) : null,
          period_end: periodEnd,
          frequency,
          filing_type: f.form ? String(f.form) : null,
          revenue: pickLineItem(report, "revenue", "totalRevenue", "Revenues"),
          net_income: pickLineItem(report, "netIncome", "netIncomeLoss", "NetIncome"),
          total_assets: pickLineItem(report, "totalAssets", "assets"),
          total_liabilities: pickLineItem(report, "totalLiabilities", "liabilities"),
          shareholders_equity: pickLineItem(report, "shareholdersEquity", "stockholdersEquity"),
          eps: pickLineItem(report, "eps", "earningsPerShare"),
          raw: f,
        },
        { onConflict: "symbol,period_end,frequency" },
      );
      if (!error) count++;
    }
  }
  return count;
}

async function importFinancials(db: SupabaseClient) {
  const dir = join(DATA_ROOT, "reported-financials");
  tryKaggleDownload(FINANCIALS_DATASET, dir);
  ensureDir(dir);

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let total = 0;
  for (const file of files) {
    total += await importFinancialsFile(db, join(dir, file));
  }
  console.log(`Imported ${total} company_financials rows from ${files.length} file(s).`);
}

/** Aggregate tick CSV rows into hourly OHLCV bars. */
async function importSpFutures(db: SupabaseClient) {
  const dir = join(DATA_ROOT, "sp-futures");
  tryKaggleDownload(SP_FUTURES_DATASET, dir);
  ensureDir(dir);

  const csvFiles = readdirSync(dir).filter((f) => f.endsWith(".csv"));
  if (csvFiles.length === 0) {
    console.warn("No SP futures CSV found. Skipping benchmark bars.");
    return;
  }

  const bars = new Map<
    string,
    { open: number; high: number; low: number; close: number; volume: number }
  >();

  for (const file of csvFiles) {
    const rl = createInterface({ input: createReadStream(join(dir, file)), crlfDelay: Infinity });
    let headers: string[] = [];
    let lineNo = 0;

    for await (const line of rl) {
      lineNo++;
      if (lineNo === 1) {
        headers = line.toLowerCase().split(",").map((h) => h.trim());
        continue;
      }
      const cols = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] ?? "").trim();
      });

      const ts = row.timestamp ?? row.time ?? row.date ?? row.datetime;
      const price = num(row.price ?? row.close ?? row.last);
      if (!ts || price == null) continue;

      const hour = new Date(ts);
      if (Number.isNaN(hour.getTime())) continue;
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      const vol = num(row.volume ?? row.size) ?? 0;
      const existing = bars.get(key);
      if (!existing) {
        bars.set(key, { open: price, high: price, low: price, close: price, volume: vol });
      } else {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
        existing.volume += vol;
      }
    }
  }

  const rows = [...bars.entries()].map(([bar_time, ohlc]) => ({
    bar_time,
    open: ohlc.open,
    high: ohlc.high,
    low: ohlc.low,
    close: ohlc.close,
    volume: Math.round(ohlc.volume),
    source: "kaggle",
  }));

  const chunk = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await db
      .from("sp_benchmark_bars")
      .upsert(rows.slice(i, i + chunk), { onConflict: "bar_time,source" });
    if (error) throw error;
    inserted += Math.min(chunk, rows.length - i);
  }

  console.log(
    `Imported ${inserted} sp_benchmark_bars from ${basename(csvFiles[0])} (${csvFiles.length} file(s)).`,
  );
}

async function main() {
  const db = admin();
  console.log("Importing Kaggle reference data...");
  await importFinancials(db);
  await importSpFutures(db);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
