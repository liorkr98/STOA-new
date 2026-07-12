import "./load-env";
import YahooFinance from "yahoo-finance2";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { UNIVERSE } from "../src/lib/universe";

/**
 * Seeds `company_financials` from Yahoo statement history for every universe ticker.
 * Use when Kaggle import is unavailable:
 *   pnpm seed:financials
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local.
 */

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 300 },
});

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function periodEnd(raw: Date | string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

type Row = {
  symbol: string;
  period_end: string;
  frequency: "annual" | "quarterly";
  filing_type: string | null;
  revenue: number | null;
  net_income: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  shareholders_equity: number | null;
  eps: number | null;
  raw: Record<string, unknown>;
};

async function rowsForSymbol(symbol: string): Promise<Row[]> {
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ["incomeStatementHistory", "balanceSheetHistory", "earningsHistory"],
  });

  const annualIncome = summary.incomeStatementHistory?.incomeStatementHistory ?? [];
  const annualBalance = summary.balanceSheetHistory?.balanceSheetStatements ?? [];
  const quarterly = summary.earningsHistory?.history ?? [];

  const byPeriod = new Map<string, Row>();

  for (const stmt of annualIncome) {
    const period_end = periodEnd(stmt.endDate);
    if (!period_end) continue;
    byPeriod.set(`annual:${period_end}`, {
      symbol,
      period_end,
      frequency: "annual",
      filing_type: "10-K",
      revenue: num(stmt.totalRevenue),
      net_income: num(stmt.netIncome),
      total_assets: null,
      total_liabilities: null,
      shareholders_equity: null,
      eps: null,
      raw: stmt as unknown as Record<string, unknown>,
    });
  }

  for (const stmt of annualBalance) {
    const period_end = periodEnd(stmt.endDate);
    if (!period_end) continue;
    const key = `annual:${period_end}`;
    const existing = byPeriod.get(key);
  const merged: Row = existing ?? {
      symbol,
      period_end,
      frequency: "annual",
      filing_type: "10-K",
      revenue: null,
      net_income: null,
      total_assets: null,
      total_liabilities: null,
      shareholders_equity: null,
      eps: null,
      raw: {},
    };
    merged.total_assets = num(stmt.totalAssets);
    merged.total_liabilities = num(stmt.totalLiab);
    merged.shareholders_equity = num(stmt.totalStockholderEquity);
    merged.raw = { ...merged.raw, balanceSheet: stmt };
    byPeriod.set(key, merged);
  }

  for (const q of quarterly.slice(0, 8)) {
    const period_end = periodEnd(q.quarter);
    if (!period_end) continue;
    byPeriod.set(`quarterly:${period_end}`, {
      symbol,
      period_end,
      frequency: "quarterly",
      filing_type: "10-Q",
      revenue: null,
      net_income: null,
      total_assets: null,
      total_liabilities: null,
      shareholders_equity: null,
      eps: num(q.epsActual),
      raw: q as unknown as Record<string, unknown>,
    });
  }

  return [...byPeriod.values()].slice(0, 12);
}

async function main() {
  const db = admin();
  let total = 0;

  for (const entry of UNIVERSE) {
    try {
      const rows = await rowsForSymbol(entry.ticker);
      if (rows.length === 0) {
        console.warn(`No financial rows for ${entry.ticker}`);
        continue;
      }
      const { error } = await db.from("company_financials").upsert(rows, {
        onConflict: "symbol,period_end,frequency",
      });
      if (error) throw new Error(`${entry.ticker}: ${error.message}`);
      total += rows.length;
      console.log(`Seeded ${rows.length} rows for ${entry.ticker}`);
    } catch (err) {
      console.warn(`Skip ${entry.ticker}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Done. Upserted ${total} company_financials rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
