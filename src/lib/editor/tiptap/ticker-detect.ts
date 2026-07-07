const TICKER_RE = /\$?([A-Z]{1,5})\b/g;
const TICKER_SINGLE = /\$?([A-Z]{1,5})\b/g;

/** Uppercase words that read as tickers but aren't. */
export const NOT_TICKERS = new Set([
  "DCF", "EPS", "YOY", "CAGR", "CEO", "CFO", "USD", "AI", "SEC", "GAAP", "TTM",
  "ROIC", "FCF", "IPO", "ETF", "API", "AND", "THE", "VS", "OR", "RSI", "SMA",
  "EMA", "MACD", "ATH", "ATL", "YTD", "QOQ", "MOM", "PE", "PB", "EV", "GDP",
  "LONG", "SHORT", "HOLD", "BUY", "SELL", "BULL", "BEAR", "CALL", "PUT", "TOP",
  "LOW", "HIGH", "KEY", "MAY", "CAN", "ALL", "NEW", "OLD", "BIG", "NOW", "OUT",
  "CASE", "VIEW", "RISK", "RATE", "MOVE", "WEEK", "YEAR", "DAYS", "WAS", "ARE",
  "HAS", "HAD", "NOT", "BUT", "FOR", "WITH", "FROM", "THAT", "THIS", "WILL",
]);

function cleanTicker(raw: string): string {
  return raw.replace(/^\$/, "").toUpperCase();
}

function isTicker(symbol: string): boolean {
  const t = cleanTicker(symbol);
  return t.length >= 1 && t.length <= 5 && !NOT_TICKERS.has(t);
}

/** Best ticker in prose — prefers $-prefixed, then last bare symbol, then report ticker. */
export function detectTicker(text: string, fallback?: string): string {
  const upper = text.toUpperCase();

  const dollar = [...upper.matchAll(/\$([A-Z]{1,5})\b/g)].map((m) => m[1]);
  for (const sym of dollar) {
    if (isTicker(sym)) return cleanTicker(sym);
  }

  const bare = [...upper.matchAll(TICKER_SINGLE)]
    .map((m) => m[1])
    .filter((t) => isTicker(t));
  if (bare.length > 0) return cleanTicker(bare[bare.length - 1]);

  return fallback && isTicker(fallback) ? cleanTicker(fallback) : "";
}

/** All plausible tickers in the text (max 8). */
export function detectTickers(text: string, fallback?: string): string[] {
  const found = [...text.toUpperCase().matchAll(TICKER_RE)]
    .map((m) => cleanTicker(m[1]))
    .filter((t) => isTicker(t));
  const unique = [...new Set(found)].slice(0, 8);
  if (unique.length > 0) return unique;
  return fallback && isTicker(fallback) ? [cleanTicker(fallback)] : [];
}
