/** Deterministic pseudo-price so mock mode is stable per symbol + day. */
export function mockPrice(symbol: string): number {
  let h = 0;
  const seed = symbol + new Date().toISOString().slice(0, 10);
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const base = 40 + (h % 400);
  const jitter = ((h >> 8) % 1000) / 100;
  return Math.round((base + jitter) * 100) / 100;
}
