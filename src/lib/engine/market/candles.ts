import YahooFinance from "yahoo-finance2";
import type { Candle, ChartRange } from "@/lib/market/candle-types";
import { cached, TTL } from "@/lib/market/cache";
import { toProviderSymbol } from "@/lib/markets/instruments";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 8, interval: 100 },
});

type YahooInterval = "5m" | "60m" | "1d" | "1wk";

const RANGE_CFG: Record<ChartRange, { interval: YahooInterval; days: number }> = {
  "1D": { interval: "5m", days: 2 },
  "1W": { interval: "60m", days: 8 },
  "1M": { interval: "1d", days: 32 },
  "3M": { interval: "1d", days: 95 },
  "6M": { interval: "1d", days: 190 },
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
  const bucket = cfg.interval === "5m" ? 15 : cfg.interval === "60m" ? 60 : 300;
  const end = Math.floor(Date.now() / 1000 / bucket) * bucket;
  return fetchBars(symbol, end - cfg.days * 86_400, end, cfg.interval);
}

/**
 * Bars between two arbitrary dates. The provider takes period1/period2 as free
 * timestamps, so a custom range is genuinely the span the reader picked rather
 * than the nearest preset; only the bar interval is chosen for them, stepping
 * up from 5-minute to weekly as the span widens.
 */
export async function getCandlesBetween(
  symbol: string,
  fromIso: string,
  toIso: string,
): Promise<Candle[]> {
  const from = Math.floor(new Date(fromIso).getTime() / 1000);
  const to = Math.floor(new Date(toIso).getTime() / 1000);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];

  const days = (to - from) / 86_400;
  const interval: YahooInterval =
    days <= 2 ? "5m" : days <= 10 ? "60m" : days <= 800 ? "1d" : "1wk";

  return fetchBars(symbol, from, to, interval);
}

async function fetchBars(
  symbol: string,
  start: number,
  end: number,
  interval: YahooInterval,
): Promise<Candle[]> {
  const ttl = interval === "5m" ? TTL.quote : interval === "60m" ? TTL.intraday : TTL.daily;
  return cached(`candles:${symbol}:${interval}:${start}:${end}`, ttl, () => loadBars(symbol, start, end, interval));
}

async function loadBars(
  symbol: string,
  start: number,
  end: number,
  interval: YahooInterval,
): Promise<Candle[]> {
  try {
    // Macro instruments carry a provider symbol the reader never sees
    // (XAUUSD is GC=F); an equity passes through untouched.
    const history = await yf.chart(toProviderSymbol(symbol.toUpperCase()), {
      period1: start,
      period2: end,
      interval,
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
