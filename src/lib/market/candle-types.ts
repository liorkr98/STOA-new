/**
 * Pure chart types + constants, safe to import from client node views. Kept
 * separate from the server-only candles fetcher so the browser bundle never
 * drags in yahoo-finance2 (a Node-only library).
 */
export type ChartRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

/** One OHLC bar. `time` is UNIX seconds (Lightweight Charts UTCTimestamp). */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const CHART_RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];
