import type { MarketProvider, Quote, QuoteSource } from "../types";
import { getCachedQuotes, putCachedQuotes } from "../quote-cache";
import { alphaVantageProvider } from "./alphavantage";
import { twelveDataProvider } from "./twelvedata";
import { yahooProvider } from "./yahoo";

/** Primary: Yahoo (no key). Fallbacks: Twelve Data, Alpha Vantage. No mock prices. */
const PROVIDERS: MarketProvider[] = [
  yahooProvider,
  twelveDataProvider,
  alphaVantageProvider,
];

function unavailableQuote(symbol: string): Quote {
  const sym = symbol.toUpperCase();
  return {
    symbol: sym,
    price: null,
    mock: false,
    available: false,
    source: "unavailable",
  };
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase();

  const { hits } = getCachedQuotes([sym]);
  const cached = hits.get(sym);
  if (cached) return cached;

  for (const provider of PROVIDERS) {
    const quote = await provider.fetchQuote(sym);
    if (quote?.available && quote.price != null) {
      putCachedQuotes([[sym, quote]]);
      return quote;
    }
  }

  return unavailableQuote(sym);
}

/** Cap on parallel per-symbol fallbacks, so a bad batch cannot fan out unbounded. */
const FALLBACK_CONCURRENCY = 8;

export async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const map = new Map<string, Quote>();

  if (unique.length === 0) return map;

  // Warm symbols cost nothing. Overlapping symbol sets across surfaces (tape,
  // movers, sector rows, Today's sidebar) mean this is usually most of them.
  const { hits, misses } = getCachedQuotes(unique);
  for (const [sym, q] of hits) map.set(sym, q);
  if (misses.length === 0) return map;

  if (yahooProvider.fetchQuotes) {
    const yahooMap = await yahooProvider.fetchQuotes(misses);
    for (const [sym, q] of yahooMap) {
      if (q.available && q.price != null) map.set(sym, q);
    }
  }

  // Anything Yahoo's batch missed goes through the provider chain. This used to
  // be a sequential for-await, so N misses cost N throttled round trips in
  // series; now they run in bounded-concurrency waves.
  const stillMissing = misses.filter((s) => !map.has(s));
  for (let i = 0; i < stillMissing.length; i += FALLBACK_CONCURRENCY) {
    const wave = stillMissing.slice(i, i + FALLBACK_CONCURRENCY);
    const quotes = await Promise.all(wave.map((sym) => fetchQuote(sym)));
    wave.forEach((sym, idx) => map.set(sym, quotes[idx]!));
  }

  putCachedQuotes(map);
  return map;
}

export function liveSources(): QuoteSource[] {
  const sources: QuoteSource[] = ["yahoo"];
  if (process.env.TWELVE_DATA_API_KEY) sources.push("twelvedata");
  if (process.env.ALPHA_VANTAGE_API_KEY) sources.push("alphavantage");
  return sources;
}
