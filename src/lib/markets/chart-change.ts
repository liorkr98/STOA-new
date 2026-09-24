import type { Candle } from "@/lib/market/candle-types";

/** The move over the charted range, last close over first. */
export function periodChangePct(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  if (!first) return null;
  return ((last - first) / first) * 100;
}
