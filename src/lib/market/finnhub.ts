import { z } from "zod";
import { cached, TTL } from "./cache";
import { toFinnhub } from "./symbols";
import {
  type Estimate,
  EstimateSchema,
  type LiveQuote,
  LiveQuoteSchema,
  MarketDataError,
  type NewsItem,
  NewsItemSchema,
  type PriceTarget,
  PriceTargetSchema,
} from "./types";

/**
 * Finnhub. Free tier 60 calls/min: real-time US quotes, fundamentals, earnings,
 * news + sentiment, insider sentiment. Server-only (key in FINNHUB_API_KEY).
 * See docs/DATA_STACK.md section 2.2.
 */

const BASE = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new MarketDataError("finnhub", "FINNHUB_API_KEY is not set.");
  }
  return key;
}

async function fh(path: string, params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ ...params, token: apiKey() });
  const url = `${BASE}${path}?${qs.toString()}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (cause) {
    throw new MarketDataError("finnhub", `Finnhub request failed: ${path}`, cause);
  }
  if (res.status === 429) {
    throw new MarketDataError("finnhub", "Finnhub rate limit hit (60/min free tier).");
  }
  if (!res.ok) {
    throw new MarketDataError("finnhub", `Finnhub responded ${res.status} for ${path}`);
  }
  return res.json();
}

function isoFromUnixSeconds(t: number): string {
  return new Date(t * 1000).toISOString();
}

const RawQuoteSchema = z.object({
  c: z.number(),
  d: z.number().nullable(),
  dp: z.number().nullable(),
  h: z.number().nullable(),
  l: z.number().nullable(),
  o: z.number().nullable(),
  pc: z.number().nullable(),
  t: z.number(),
});

/** Real-time quote. `c` of 0 means Finnhub has no data for the symbol. */
export async function getLiveQuote(symbol: string): Promise<LiveQuote> {
  const sym = toFinnhub(symbol);
  return cached(`finnhub:quote:${sym}`, TTL.quote, async () => {
    const raw = RawQuoteSchema.parse(await fh("/quote", { symbol: sym }));
    if (raw.c === 0 && raw.pc === 0) {
      throw new MarketDataError("finnhub", `No quote for ${sym}`);
    }
    return LiveQuoteSchema.parse({
      symbol: sym,
      price: raw.c,
      change: raw.d,
      percentChange: raw.dp,
      high: raw.h,
      low: raw.l,
      open: raw.o,
      prevClose: raw.pc,
      asOf: isoFromUnixSeconds(raw.t || Math.floor(Date.now() / 1000)),
      provider: "finnhub",
    });
  });
}

const RawPriceTargetSchema = z.object({
  symbol: z.string().optional(),
  targetHigh: z.number().nullable().optional(),
  targetLow: z.number().nullable().optional(),
  targetMean: z.number().nullable().optional(),
  targetMedian: z.number().nullable().optional(),
  lastUpdated: z.string().nullable().optional(),
  numberOfAnalysts: z.number().nullable().optional(),
});

/** Analyst price-target range (A7). Some fields require a paid plan; nulls are honest. */
export async function getPriceTarget(symbol: string): Promise<PriceTarget> {
  const sym = toFinnhub(symbol);
  return cached(`finnhub:pt:${sym}`, TTL.fundamentals, async () => {
    const raw = RawPriceTargetSchema.parse(await fh("/stock/price-target", { symbol: sym }));
    return PriceTargetSchema.parse({
      symbol: sym,
      high: raw.targetHigh ?? null,
      low: raw.targetLow ?? null,
      mean: raw.targetMean ?? null,
      median: raw.targetMedian ?? null,
      count: raw.numberOfAnalysts ?? null,
      asOf: raw.lastUpdated ?? null,
    });
  });
}

const RawEarningsSchema = z.array(
  z.object({
    actual: z.number().nullable(),
    estimate: z.number().nullable(),
    period: z.string(),
    quarter: z.number().nullable().optional(),
    year: z.number().nullable().optional(),
  }),
);

/**
 * EPS estimates vs actuals per period (A7). Revenue estimates require a paid
 * plan, so those come from FMP or the Data Service; here revenue is null.
 */
export async function getEpsEstimates(symbol: string): Promise<Estimate[]> {
  const sym = toFinnhub(symbol);
  return cached(`finnhub:eps:${sym}`, TTL.fundamentals, async () => {
    const raw = RawEarningsSchema.parse(await fh("/stock/earnings", { symbol: sym }));
    return raw
      .map((e) =>
        EstimateSchema.parse({
          period: e.period,
          revenueEstimate: null,
          revenueActual: null,
          epsEstimate: e.estimate,
          epsActual: e.actual,
        }),
      )
      .sort((a, b) => a.period.localeCompare(b.period));
  });
}

const RawNewsSchema = z.array(
  z.object({
    headline: z.string(),
    summary: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    url: z.string(),
    datetime: z.number(),
  }),
);

/** Company news over a date window (A15). Dates are YYYY-MM-DD. */
export async function getCompanyNews(
  symbol: string,
  from: string,
  to: string,
): Promise<NewsItem[]> {
  const sym = toFinnhub(symbol);
  const raw = RawNewsSchema.parse(await fh("/company-news", { symbol: sym, from, to }));
  return raw.map((n) =>
    NewsItemSchema.parse({
      headline: n.headline,
      summary: n.summary ?? null,
      source: n.source ?? null,
      url: n.url,
      datetime: isoFromUnixSeconds(n.datetime),
      sentiment: null,
    }),
  );
}

/** Raw "all metrics" bundle. Loosely typed by design -- Finnhub's metric set is broad. */
export async function getBasicFinancials(
  symbol: string,
): Promise<Record<string, number | string | null>> {
  const sym = toFinnhub(symbol);
  return cached(`finnhub:metric:${sym}`, TTL.fundamentals, async () => {
    const schema = z.object({ metric: z.record(z.string(), z.any()).optional() });
    const parsed = schema.parse(await fh("/stock/metric", { symbol: sym, metric: "all" }));
    return (parsed.metric ?? {}) as Record<string, number | string | null>;
  });
}
