/**
 * Market data provider. Server-only.
 *
 * Default provider is Finnhub (free tier). If no API key is set, the engine
 * falls back to deterministic mock prices so the app is fully runnable offline
 * for development and demos. The S&P benchmark uses the SPY ETF as a proxy.
 */

const BENCHMARK_SYMBOL = "SPY";

export interface Quote {
  symbol: string;
  price: number;
  /** True when the value came from the mock fallback, not a live feed. */
  mock: boolean;
}

function hasKey() {
  return Boolean(process.env.FINNHUB_API_KEY);
}

/** Deterministic pseudo-price so mock mode is stable per symbol + day. */
function mockPrice(symbol: string): number {
  let h = 0;
  const seed = symbol + new Date().toISOString().slice(0, 10);
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const base = 40 + (h % 400);
  const jitter = ((h >> 8) % 1000) / 100; // 0-10
  return Math.round((base + jitter) * 100) / 100;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase();
  if (!hasKey()) return { symbol: sym, price: mockPrice(sym), mock: true };

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${process.env.FINNHUB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`finnhub ${res.status}`);
    const json = (await res.json()) as { c?: number };
    if (!json.c || json.c <= 0) throw new Error("no price");
    return { symbol: sym, price: json.c, mock: false };
  } catch {
    return { symbol: sym, price: mockPrice(sym), mock: true };
  }
}

export async function getBenchmarkQuote(): Promise<Quote> {
  return getQuote(BENCHMARK_SYMBOL);
}

/** Percent return of SPY between a captured baseline and now. */
export async function benchmarkReturnSince(lockPrice: number | null): Promise<number | null> {
  if (!lockPrice || lockPrice <= 0) return null;
  const now = await getBenchmarkQuote();
  return ((now.price - lockPrice) / lockPrice) * 100;
}
