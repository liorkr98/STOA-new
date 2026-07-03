import YahooFinance from "yahoo-finance2";
import type { Candle, ChartRange } from "@/lib/market/candle-types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type YahooInterval = "5m" | "60m" | "1d" | "1wk";

const RANGE_CFG: Record<ChartRange, { interval: YahooInterval; days: number }> = {
  "1D": { interval: "5m", days: 2 },
  "1W": { interval: "60m", days: 8 },
  "1M": { interval: "1d", days: 32 },
  "3M": { interval: "1d", days: 95 },
  "1Y": { interval: "1d", days: 370 },
  "5Y": { interval: "1wk", days: 1830 },
};

/**
 * OHLC history for a ticker + range, server-only (keeps the data provider off
 * the client, per the chart-node data-source rule). Feeds the chartNode's
 * Lightweight Charts render. Ascending, de-duplicated bars; empty array on
 * any failure so the node view can show a calm empty state.
 */
export async function getCandles(symbol: string, range: ChartRange): Promise<Candle[]> {
  const cfg = RANGE_CFG[range] ?? RANGE_CFG["3M"];
  const end = Math.floor(Date.now() / 1000);
  const start = end - cfg.days * 86_400;
  try {
    const history = await yf.chart(symbol.toUpperCase(), {
      period1: start,
      period2: end,
      interval: cfg.interval,
    });
    const seen = new Set<number>();
    const bars: Candle[] = [];
    for (const q of history.quotes ?? []) {
      if (
        q.date == null ||
        q.open == null ||
        q.high == null ||
        q.low == null ||
        q.close == null
      ) {
        continue;
      }
      const time = Math.floor(new Date(q.date).getTime() / 1000);
      if (seen.has(time)) continue;
      seen.add(time);
      bars.push({ time, open: q.open, high: q.high, low: q.low, close: q.close });
    }
    return bars.sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}
