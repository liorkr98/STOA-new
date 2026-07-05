import { z } from "zod";
import { cached, TTL } from "./cache";
import { toFmp } from "./symbols";
import {
  type Comparison,
  type ComparisonMetric,
  ComparisonSchema,
  type FinancialStatement,
  FinancialStatementSchema,
  MarketDataError,
  type PeerSet,
  PeerSetSchema,
} from "./types";

/**
 * Financial Modeling Prep. Broad modeled fundamentals + peers (~250 req/day
 * free). Also reachable as an MCP in agent context; this is the runtime HTTP
 * path. EDGAR stays the citable source of truth -- FMP figures are labeled
 * "provider", not "filing". Server-only (FMP_API_KEY). See DATA_STACK.md 2.3.
 */

const V3 = "https://financialmodelingprep.com/api/v3";
const V4 = "https://financialmodelingprep.com/api/v4";

function apiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new MarketDataError("fmp", "FMP_API_KEY is not set.");
  }
  return key;
}

async function fmpFetch(url: string): Promise<unknown> {
  const withKey = `${url}${url.includes("?") ? "&" : "?"}apikey=${apiKey()}`;
  let res: Response;
  try {
    res = await fetch(withKey);
  } catch (cause) {
    throw new MarketDataError("fmp", `FMP request failed: ${url}`, cause);
  }
  if (res.status === 429) {
    throw new MarketDataError("fmp", "FMP rate limit hit (~250/day free tier).");
  }
  if (!res.ok) {
    throw new MarketDataError("fmp", `FMP responded ${res.status} for ${url}`);
  }
  return res.json();
}

const PeersSchema = z.array(z.object({ symbol: z.string(), peersList: z.array(z.string()) }));

/** Peer set for the comparison block (A6). */
export async function getPeers(symbol: string): Promise<PeerSet> {
  const sym = toFmp(symbol);
  return cached(`fmp:peers:${sym}`, TTL.fundamentals, async () => {
    const raw = PeersSchema.parse(await fmpFetch(`${V4}/stock_peers?symbol=${sym}`));
    return PeerSetSchema.parse({ symbol: sym, peers: raw[0]?.peersList ?? [] });
  });
}

const IncomeRowSchema = z.object({
  date: z.string(),
  calendarYear: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  revenue: z.number().nullable().optional(),
  grossProfit: z.number().nullable().optional(),
  operatingIncome: z.number().nullable().optional(),
  netIncome: z.number().nullable().optional(),
  eps: z.number().nullable().optional(),
});

const INCOME_LINES: { concept: string; label: string; key: keyof z.infer<typeof IncomeRowSchema> }[] =
  [
    { concept: "revenue", label: "Revenue", key: "revenue" },
    { concept: "grossProfit", label: "Gross Profit", key: "grossProfit" },
    { concept: "operatingIncome", label: "Operating Income", key: "operatingIncome" },
    { concept: "netIncome", label: "Net Income", key: "netIncome" },
    { concept: "eps", label: "EPS (diluted)", key: "eps" },
  ];

/**
 * Modeled income statement, N periods (A4 fallback when EDGAR isn't practical).
 * Returned oldest-first. Labeled as a provider source, not a filing.
 */
export async function getIncomeStatement(
  symbol: string,
  opts: { period?: "annual" | "quarter"; limit?: number } = {},
): Promise<FinancialStatement> {
  const sym = toFmp(symbol);
  const period = opts.period ?? "annual";
  const limit = opts.limit ?? 5;
  const key = `fmp:income:${sym}:${period}:${limit}`;
  return cached(key, TTL.fundamentals, async () => {
    const raw = z
      .array(IncomeRowSchema)
      .parse(await fmpFetch(`${V3}/income-statement/${sym}?period=${period}&limit=${limit}`));
    const rows = [...raw].sort((a, b) => a.date.localeCompare(b.date));
    const periods = rows.map((r) => r.calendarYear ?? r.date);
    const lines = INCOME_LINES.map((l) => ({
      concept: l.concept,
      label: l.label,
      values: rows.map((r) => (r[l.key] as number | null | undefined) ?? null),
    }));
    return FinancialStatementSchema.parse({
      symbol: sym,
      kind: "income",
      periods,
      lines,
      source: { kind: "provider", provider: "fmp", asOf: rows[rows.length - 1]?.date },
    });
  });
}

const METRIC_UNIT: Record<ComparisonMetric, "currency" | "perShare" | "pct"> = {
  revenue: "currency",
  netIncome: "currency",
  eps: "perShare",
  grossMargin: "pct",
  operatingMargin: "pct",
  netMargin: "pct",
  revenueGrowth: "pct",
};

interface YearValues {
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
}

function lineByYear(s: FinancialStatement, concept: string): Map<string, number> {
  const line = s.lines.find((l) => l.concept === concept);
  const map = new Map<string, number>();
  if (!line) return map;
  s.periods.forEach((p, i) => {
    const v = line.values[i];
    if (v != null) map.set(p, v);
  });
  return map;
}

function computeMetric(
  metric: ComparisonMetric,
  y: YearValues,
  prevRevenue: number | null,
): number | null {
  switch (metric) {
    case "revenue":
      return y.revenue;
    case "netIncome":
      return y.netIncome;
    case "eps":
      return y.eps;
    case "grossMargin":
      return y.revenue && y.grossProfit != null ? (y.grossProfit / y.revenue) * 100 : null;
    case "operatingMargin":
      return y.revenue && y.operatingIncome != null ? (y.operatingIncome / y.revenue) * 100 : null;
    case "netMargin":
      return y.revenue && y.netIncome != null ? (y.netIncome / y.revenue) * 100 : null;
    case "revenueGrowth":
      return y.revenue != null && prevRevenue != null && prevRevenue !== 0
        ? ((y.revenue - prevRevenue) / Math.abs(prevRevenue)) * 100
        : null;
  }
}

/**
 * A metric compared across 2-8 tickers over time (A6). Modeled fundamentals
 * from FMP; margins/growth are derived. One income-statement pull per ticker
 * (cached), fetched concurrently.
 */
export async function getComparison(
  symbols: string[],
  metric: ComparisonMetric,
  years = 5,
): Promise<Comparison> {
  const uniq = [...new Set(symbols.map(toFmp).filter(Boolean))].slice(0, 8);
  const perSymbol = await Promise.all(
    uniq.map(async (sym) => {
      const stmt = await getIncomeStatement(sym, { period: "annual", limit: years + 1 });
      return {
        sym,
        periods: stmt.periods,
        revenue: lineByYear(stmt, "revenue"),
        grossProfit: lineByYear(stmt, "grossProfit"),
        operatingIncome: lineByYear(stmt, "operatingIncome"),
        netIncome: lineByYear(stmt, "netIncome"),
        eps: lineByYear(stmt, "eps"),
      };
    }),
  );

  const yearSet = new Set<string>();
  for (const s of perSymbol) for (const p of s.periods) yearSet.add(p);
  const allYears = [...yearSet].sort();
  const periods = allYears.slice(-Math.min(10, Math.max(1, years)));

  const series = perSymbol.map((s) => ({
    symbol: s.sym,
    values: periods.map((y) => {
      const prevYear = allYears[allYears.indexOf(y) - 1];
      const yv: YearValues = {
        revenue: s.revenue.get(y) ?? null,
        grossProfit: s.grossProfit.get(y) ?? null,
        operatingIncome: s.operatingIncome.get(y) ?? null,
        netIncome: s.netIncome.get(y) ?? null,
        eps: s.eps.get(y) ?? null,
      };
      const prevRevenue = prevYear ? (s.revenue.get(prevYear) ?? null) : null;
      return computeMetric(metric, yv, prevRevenue);
    }),
  }));

  return ComparisonSchema.parse({
    metric,
    unit: METRIC_UNIT[metric],
    periods,
    series,
    source: { kind: "provider", provider: "fmp" },
  });
}
