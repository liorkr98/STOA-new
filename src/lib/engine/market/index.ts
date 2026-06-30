/**
 * Market data provider. Server-only.
 *
 * Primary: Yahoo Finance via yahoo-finance2 (Node equivalent of Python yfinance).
 * Fallbacks: Twelve Data, Alpha Vantage. Final fallback: deterministic mock prices.
 * Benchmark symbol: SPY (S&P 500 ETF).
 */

import { fetchQuote, fetchQuotesBatch } from "./providers/chain";
import type { Quote } from "./types";

export type { CompanyFundamentals, Quote, QuoteSource } from "./types";
export { getCompanyFundamentals } from "./fundamentals";

const BENCHMARK_SYMBOL = "SPY";

export async function getQuote(symbol: string): Promise<Quote> {
  return fetchQuote(symbol);
}

/**
 * Fetches many symbols. Uses Yahoo batch quotes when possible; always includes SPY
 * when fetchBenchmark is true.
 */
export async function getQuotesBatch(
  symbols: string[],
  opts: { fetchBenchmark?: boolean; concurrency?: number; delayMs?: number } = {},
): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (opts.fetchBenchmark !== false && !unique.includes(BENCHMARK_SYMBOL)) {
    unique.push(BENCHMARK_SYMBOL);
  }

  const map = await fetchQuotesBatch(unique);

  // Ensure every requested symbol has an entry (chain already mocks misses).
  for (const sym of unique) {
    if (!map.has(sym)) map.set(sym, await fetchQuote(sym));
  }

  return map;
}

export async function getBenchmarkQuote(): Promise<Quote> {
  return getQuote(BENCHMARK_SYMBOL);
}

/** Percent return of SPY between a captured baseline and a resolved price. */
export function benchmarkReturn(
  lockPrice: number | null,
  resolvedPrice: number,
): number | null {
  if (!lockPrice || lockPrice <= 0) return null;
  return ((resolvedPrice - lockPrice) / lockPrice) * 100;
}

/** Percent return of SPY between a captured baseline and now (live quote). */
export async function benchmarkReturnSince(lockPrice: number | null): Promise<number | null> {
  if (!lockPrice || lockPrice <= 0) return null;
  const now = await getBenchmarkQuote();
  return benchmarkReturn(lockPrice, now.price);
}
