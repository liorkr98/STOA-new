/**
 * Client-safe call shapes for the stock chart. Kept separate from
 * `build-stock.ts` so the browser bundle never drags in the server-only data
 * layer, mirroring the `candle-types` / `candles` split.
 */
import type { ChartRange } from "@/lib/market/candle-types";
import type { Direction, Outcome } from "@/lib/types";

/**
 * Timeframes offered on the stock chart. Lives here rather than in the chart
 * component because the server page validates `?range=` against it, and a
 * value exported from a "use client" module reaches the server as a client
 * reference, not the array itself.
 */
export const STOCK_RANGES: ChartRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

/** Sentinel for the custom from/to range, kept out of the preset list. */
export const CUSTOM_RANGE = "CUSTOM";

/**
 * Call horizons run weeks to months, so on a single trading day every target
 * line sits far off-scale and the chart implies a precision the calls do not
 * have. 1D therefore drops the overlay entirely rather than clipping it.
 */
export function overlayVisible(range: string): boolean {
  return range !== "1D";
}

export interface StockAnalyst {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  score: number | null;
  provisional: boolean;
  /** Two-letter mark used to label a target line at the chart's right edge. */
  initials: string;
}

export interface OpenCall {
  reportId: string;
  analyst: StockAnalyst;
  direction: Direction;
  entryPrice: number;
  targetPrice: number | null;
  lockedAt: string;
  resolvesAt: string;
  daysLeft: number;
}

export interface ResolvedCall {
  reportId: string;
  analyst: StockAnalyst;
  direction: Direction;
  entryPrice: number;
  exitPrice: number | null;
  returnPct: number | null;
  outcome: Exclude<Outcome, "open">;
  lockedAt: string;
  resolvedAt: string;
}

export interface StockConsensus {
  openCount: number;
  long: number;
  short: number;
  averageTarget: number | null;
  averageScore: number | null;
  /** Hit rate across resolved calls on this name. Null with no history. */
  hitRatePct: number | null;
  resolvedCount: number;
}

/** Open target lines drawn on the chart, before the consensus band takes over. */
export const MAX_TARGET_LINES = 5;
