/**
 * Market data provider. Server-only.
 *
 * Default provider is Finnhub (free tier, 60 calls/min). If no API key is set,
 * the engine falls back to deterministic mock prices. The S&P benchmark uses SPY.
 */

const BENCHMARK_SYMBOL = "SPY";
const FINNHUB_BATCH = 5;
const FINNHUB_DELAY_MS = 1100;

export interface Quote {
  symbol: string;
  price: number;
  /** True when the value came from the mock fallback, not a live feed. */
  mock: boolean;
}

function hasKey() {
  return Boolean(process.env.FINNHUB_API_KEY);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deterministic pseudo-price so mock mode is stable per symbol + day. */
function mockPrice(symbol: string): number {
  let h = 0;
  const seed = symbol + new Date().toISOString().slice(0, 10);
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const base = 40 + (h % 400);
  const jitter = ((h >> 8) % 1000) / 100;
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

/**
 * Fetches many symbols with bounded concurrency and pacing for Finnhub limits.
 * Deduplicates symbols; always includes SPY when fetchBenchmark is true.
 */
export async function getQuotesBatch(
  symbols: string[],
  opts: { fetchBenchmark?: boolean; concurrency?: number; delayMs?: number } = {},
): Promise<Map<string, Quote>> {
  const concurrency = opts.concurrency ?? FINNHUB_BATCH;
  const delayMs = opts.delayMs ?? FINNHUB_DELAY_MS;
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (opts.fetchBenchmark !== false && !unique.includes(BENCHMARK_SYMBOL)) {
    unique.push(BENCHMARK_SYMBOL);
  }

  const map = new Map<string, Quote>();
  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((sym) => getQuote(sym)));
    for (const q of results) map.set(q.symbol, q);
    if (hasKey() && i + concurrency < unique.length) await sleep(delayMs);
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
