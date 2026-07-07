import type { ChartRange } from "@/lib/market/candle-types";

/** Map Stoa chart ranges to TradingView widget intervals. */
export function chartRangeToTvInterval(range: ChartRange): string {
  switch (range) {
    case "1D":
      return "15";
    case "1W":
      return "60";
    case "1M":
    case "3M":
      return "D";
    case "1Y":
      return "W";
    case "5Y":
      return "M";
    default:
      return "D";
  }
}

const NYSE_TICKERS = new Set([
  "JPM", "BAC", "WMT", "JNJ", "PG", "XOM", "CVX", "KO", "PEP", "DIS",
  "VZ", "T", "GE", "IBM", "MMM", "BA", "CAT", "GS", "MS", "C",
]);

/**
 * Best-effort ticker → TradingView symbol (EXCHANGE:SYMBOL).
 * Analysts can change symbol inside the widget via allow_symbol_change.
 */
export function toTradingViewSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (!raw) return "NASDAQ:AAPL";
  if (raw.includes(":")) return raw;
  const exchange = NYSE_TICKERS.has(raw) ? "NYSE" : "NASDAQ";
  return `${exchange}:${raw}`;
}
