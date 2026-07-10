#!/usr/bin/env node
/**
 * Fetches Yahoo statement history and prints SQL INSERT statements for company_financials.
 * Used when service-role env is unavailable in CI; pipe output to Supabase SQL editor or MCP.
 */
import YahooFinance from "yahoo-finance2";
import { UNIVERSE } from "../src/lib/universe";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 300 },
});

function esc(s: string) {
  return s.replace(/'/g, "''");
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
  filing_type: string;
  revenue: number | null;
  net_income: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  shareholders_equity: number | null;
  eps: number | null;
};

function rowToSql(row: Row): string {
  const n = (v: number | null) => (v == null ? "null" : String(v));
  return `('${esc(row.symbol)}', '${row.period_end}', '${row.frequency}', '${row.filing_type}', ${n(row.revenue)}, ${n(row.net_income)}, ${n(row.total_assets)}, ${n(row.total_liabilities)}, ${n(row.shareholders_equity)}, ${n(row.eps)})`;
}

async function rowsForSymbol(symbol: string): Promise<Row[]> {
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ["incomeStatementHistory", "balanceSheetHistory", "earningsHistory"],
  });

  const byKey = new Map<string, Row>();

  for (const stmt of summary.incomeStatementHistory?.incomeStatementHistory ?? []) {
    const period_end = periodEnd(stmt.endDate);
    if (!period_end) continue;
    byKey.set(`annual:${period_end}`, {
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
    });
  }

  for (const stmt of summary.balanceSheetHistory?.balanceSheetStatements ?? []) {
    const period_end = periodEnd(stmt.endDate);
    if (!period_end) continue;
    const key = `annual:${period_end}`;
    const existing = byKey.get(key) ?? {
      symbol,
      period_end,
      frequency: "annual" as const,
      filing_type: "10-K",
      revenue: null,
      net_income: null,
      total_assets: null,
      total_liabilities: null,
      shareholders_equity: null,
      eps: null,
    };
    existing.total_assets = num(stmt.totalAssets);
    existing.total_liabilities = num(stmt.totalLiab);
    existing.shareholders_equity = num(stmt.totalStockholderEquity);
    byKey.set(key, existing);
  }

  for (const q of (summary.earningsHistory?.history ?? []).slice(0, 8)) {
    const period_end = periodEnd(q.quarter);
    if (!period_end) continue;
    byKey.set(`quarterly:${period_end}`, {
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
    });
  }

  return [...byKey.values()].slice(0, 12);
}

async function main() {
  const values: string[] = [];

  for (const entry of UNIVERSE) {
    try {
      const rows = await rowsForSymbol(entry.ticker);
      values.push(...rows.map(rowToSql));
    } catch (err) {
      console.error(`-- skip ${entry.ticker}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (values.length === 0) {
    console.error("No rows generated.");
    process.exit(1);
  }

  const chunk = 40;
  for (let i = 0; i < values.length; i += chunk) {
    const slice = values.slice(i, i + chunk);
    console.log(`insert into company_financials (symbol, period_end, frequency, filing_type, revenue, net_income, total_assets, total_liabilities, shareholders_equity, eps)
values
${slice.join(",\n")}
on conflict (symbol, period_end, frequency) do update set
  revenue = coalesce(excluded.revenue, company_financials.revenue),
  net_income = coalesce(excluded.net_income, company_financials.net_income),
  total_assets = coalesce(excluded.total_assets, company_financials.total_assets),
  total_liabilities = coalesce(excluded.total_liabilities, company_financials.total_liabilities),
  shareholders_equity = coalesce(excluded.shareholders_equity, company_financials.shareholders_equity),
  eps = coalesce(excluded.eps, company_financials.eps);`);
  }
}

main();
