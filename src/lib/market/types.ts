import { z } from "zod";

/**
 * Shared market-data types + zod schemas. Every external payload is validated
 * against a schema here before it travels upward (spec invariant #4, see
 * docs/DATA_STACK.md). Pure module -- safe to import anywhere.
 */

/** Which layer a value came from. EDGAR/Finnhub are authoritative; the rest are modeled/delayed. */
export type Provider =
  | "edgar"
  | "finnhub"
  | "fmp"
  | "data-service"
  | "yahoo"
  | "alphavantage"
  | "twelvedata"
  | "manual";

/**
 * Provenance stamped on a figure so it can carry its source into a block and
 * feed the fact-checker / citation ledger (A10/A17).
 */
export const SourceRefSchema = z.object({
  kind: z.enum(["filing", "provider", "manual"]),
  provider: z.string().optional(),
  url: z.string().optional(),
  asOf: z.string().optional(),
  accession: z.string().optional(),
  concept: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

/** A single point-in-time live quote (Finnhub-shaped, provider-normalized). */
export const LiveQuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change: z.number().nullable(),
  percentChange: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  open: z.number().nullable(),
  prevClose: z.number().nullable(),
  asOf: z.string(),
  provider: z.string(),
});
export type LiveQuote = z.infer<typeof LiveQuoteSchema>;

/** One reported figure for one period, with its filing provenance (EDGAR). */
export const FilingFigureSchema = z.object({
  concept: z.string(),
  label: z.string().nullable(),
  unit: z.string(),
  value: z.number(),
  periodStart: z.string().nullable(),
  periodEnd: z.string(),
  fy: z.number().nullable(),
  fp: z.string().nullable(),
  form: z.string().nullable(),
  filed: z.string().nullable(),
  accession: z.string().nullable(),
});
export type FilingFigure = z.infer<typeof FilingFigureSchema>;

/** One row of a financial statement across periods. */
export const StatementLineSchema = z.object({
  concept: z.string(),
  label: z.string(),
  values: z.array(z.number().nullable()),
});
export type StatementLine = z.infer<typeof StatementLineSchema>;

export type StatementKind = "income" | "balance" | "cashflow";

export const FinancialStatementSchema = z.object({
  symbol: z.string(),
  kind: z.enum(["income", "balance", "cashflow"]),
  periods: z.array(z.string()),
  lines: z.array(StatementLineSchema),
  source: SourceRefSchema,
});
export type FinancialStatement = z.infer<typeof FinancialStatementSchema>;

/** A company-specific reporting segment or KPI over periods (A5). */
export const SegmentSeriesSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  unit: z.string().nullable(),
  periods: z.array(z.string()),
  values: z.array(z.number().nullable()),
});
export type SegmentSeries = z.infer<typeof SegmentSeriesSchema>;

/** Consensus estimate vs actual for one period (A7). */
export const EstimateSchema = z.object({
  period: z.string(),
  revenueEstimate: z.number().nullable(),
  revenueActual: z.number().nullable(),
  epsEstimate: z.number().nullable(),
  epsActual: z.number().nullable(),
});
export type Estimate = z.infer<typeof EstimateSchema>;

/** Analyst price-target range (A7). */
export const PriceTargetSchema = z.object({
  symbol: z.string(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
  count: z.number().nullable(),
  asOf: z.string().nullable(),
});
export type PriceTarget = z.infer<typeof PriceTargetSchema>;

/** A news item with optional sentiment (A15). */
export const NewsItemSchema = z.object({
  headline: z.string(),
  summary: z.string().nullable(),
  source: z.string().nullable(),
  url: z.string(),
  datetime: z.string(),
  sentiment: z.number().nullable(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

/** Peer set for comparison (A6). */
export const PeerSetSchema = z.object({
  symbol: z.string(),
  peers: z.array(z.string()),
});
export type PeerSet = z.infer<typeof PeerSetSchema>;

/** A metric that can be compared across tickers over time (A6). */
export type ComparisonMetric =
  | "revenue"
  | "netIncome"
  | "eps"
  | "grossMargin"
  | "operatingMargin"
  | "netMargin"
  | "revenueGrowth";

/** Multi-ticker metric-over-time series (A6). */
export const ComparisonSchema = z.object({
  metric: z.string(),
  /** Drives axis/label formatting. */
  unit: z.enum(["currency", "perShare", "pct"]),
  periods: z.array(z.string()),
  series: z.array(
    z.object({ symbol: z.string(), values: z.array(z.number().nullable()) }),
  ),
  source: SourceRefSchema,
});
export type Comparison = z.infer<typeof ComparisonSchema>;

/**
 * Raised when a provider is unavailable (missing key, rate-limited, or bad
 * payload). Routes catch this and return a calm 503, never a 500 stack.
 */
export class MarketDataError extends Error {
  readonly provider: Provider;
  readonly cause?: unknown;
  constructor(provider: Provider, message: string, cause?: unknown) {
    super(message);
    this.name = "MarketDataError";
    this.provider = provider;
    this.cause = cause;
  }
}
