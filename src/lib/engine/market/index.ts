/**
 * Market data provider. Server-only.
 *
 * Primary: Yahoo Finance via yahoo-finance2.
 * Fallbacks: Twelve Data, Alpha Vantage. No mock/simulated prices.
 */

import { fetchQuote, fetchQuotesBatch } from "./providers/chain";
import { toProviderSymbol } from "@/lib/markets/instruments";
import type { Quote } from "./types";

export type { CompanyFundamentals, Quote, QuoteSource } from "./types";
export type { StockSnapshot } from "./snapshot";
export { getCompanyFundamentals } from "./fundamentals";
export { getStockSnapshot } from "./snapshot";

const BENCHMARK_SYMBOL = "SPY";

/**
 * A quote for one symbol. Macro instruments (gold, crude, Treasury yields,
 * bitcoin) are asked for under the provider's own symbol and handed back
 * under the Stoa one, so no caller has to know that XAUUSD is GC=F.
 */
export async function getQuote(symbol: string): Promise<Quote> {
  const asked = symbol.toUpperCase();
  const quote = await fetchQuote(toProviderSymbol(asked));
  return quote.symbol === asked ? quote : { ...quote, symbol: asked };
}

export async function getQuotesBatch(
  symbols: string[],
  opts: { fetchBenchmark?: boolean } = {},
): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (opts.fetchBenchmark !== false && !unique.includes(BENCHMARK_SYMBOL)) {
    unique.push(BENCHMARK_SYMBOL);
  }

  // The result is keyed by whatever the caller asked for, not by what the
  // provider was asked. A surface that already works in provider symbols
  // (the tape asks for ^GSPC and CL=F directly) keeps its own keys, while a
  // surface asking for XAUUSD gets XAUUSD back.
  const askedFor = new Map<string, string[]>();
  for (const sym of unique) {
    const provider = toProviderSymbol(sym);
    const asked = askedFor.get(provider);
    if (asked) asked.push(sym);
    else askedFor.set(provider, [sym]);
  }

  const raw = await fetchQuotesBatch([...askedFor.keys()]);

  const map = new Map<string, Quote>();
  for (const [provider, quote] of raw) {
    if (!quote?.available || quote.price == null) continue;
    for (const asked of askedFor.get(provider) ?? [provider]) {
      map.set(asked, asked === quote.symbol ? quote : { ...quote, symbol: asked });
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
