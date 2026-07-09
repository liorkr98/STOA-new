/**
 * Market data provider. Server-only.
 *
 * Primary: Yahoo Finance via yahoo-finance2.
 * Fallbacks: Twelve Data, Alpha Vantage. No mock/simulated prices.
 */

import { fetchQuote, fetchQuotesBatch } from "./providers/chain";
import type { Quote } from "./types";

export type { CompanyFundamentals, Quote, QuoteSource } from "./types";
export type { StockSnapshot } from "./snapshot";
export { getCompanyFundamentals } from "./fundamentals";
export { getStockSnapshot } from "./snapshot";

const BENCHMARK_SYMBOL = "SPY";

export async function getQuote(symbol: string): Promise<Quote> {
  return fetchQuote(symbol);
}

export async function getQuotesBatch(
  symbols: string[],
  opts: { fetchBenchmark?: boolean } = {},
): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (opts.fetchBenchmark !== false && !unique.includes(BENCHMARK_SYMBOL)) {
    unique.push(BENCHMARK_SYMBOL);
  }

  const map = await fetchQuotesBatch(unique);

  for (const sym of unique) {
    const q = map.get(sym);
    if (!q?.available || q.price == null) {
      map.delete(sym);
    }
  }

  return map;
}

export async function getBenchmarkQuote(): Promise<Quote> {
  return getQuote(BENCHMARK_SYMBOL);
}

export function benchmarkReturn(
  lockPrice: number | null,
  resolvedPrice: number | null,
): number | null {
  if (!lockPrice || lockPrice <= 0 || resolvedPrice == null) return null;
  return ((resolvedPrice - lockPrice) / lockPrice) * 100;
}

export async function benchmarkReturnSince(lockPrice: number | null): Promise<number | null> {
  if (!lockPrice || lockPrice <= 0) return null;
  const now = await getBenchmarkQuote();
  if (!now.available || now.price == null) return null;
  return benchmarkReturn(lockPrice, now.price);
}
