/**
 * Timeframes offered on the price chart. Lives here rather than in the chart
 * component because the server page validates `?range=` against it, and a
 * value exported from a "use client" module reaches the server as a client
 * reference, not the array itself.
 */
import type { ChartRange } from "@/lib/market/candle-types";

export const STOCK_RANGES: ChartRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

/** Sentinel for the custom from/to range, kept out of the preset list. */
export const CUSTOM_RANGE = "CUSTOM";
