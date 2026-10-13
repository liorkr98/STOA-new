import type { Candle } from "@/lib/market/candle-types";

/**
 * A ticker's move over one cart week: the last close inside the week against
 * the last close before it began. Null when either is missing (a week with no
 * trading yet, or one older than the bars on hand).
 */
export function weekMove(candles: Candle[], fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso) / 1000;
  const to = Date.parse(toIso) / 1000;
  let base: number | null = null;
  let last: number | null = null;
  for (const c of candles) {
    if (c.time < from) base = c.close;
    else if (c.time < to) last = c.close;
  }
  if (base == null || last == null || base === 0) return null;
  return ((last - base) / base) * 100;
}
