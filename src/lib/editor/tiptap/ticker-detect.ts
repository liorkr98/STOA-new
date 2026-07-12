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

function dollarTickers(text: string): string[] {
  return [...text.toUpperCase().matchAll(/\$([A-Z]{1,5})\b/g)]
    .map((m) => m[1])
    .filter((t) => isTicker(t))
    .map(cleanTicker);
}

function bareTickers(text: string): string[] {
  return [...text.toUpperCase().matchAll(TICKER_SINGLE)]
    .map((m) => m[1])
    .filter((t) => isTicker(t))
    .map(cleanTicker);
}

/**
 * Best ticker in prose — $-prefixed symbols win; else report ticker when set;
 * else last bare symbol in text.
 */
export function detectTicker(text: string, fallback?: string): string {
  const dollar = dollarTickers(text);
  if (dollar.length > 0) return dollar[0];

  const bare = bareTickers(text);
  const report = fallback && isTicker(fallback) ? cleanTicker(fallback) : "";

  if (report) {
    if (bare.length === 0) return report;
    if (bare.length === 1 && bare[0] === report) return report;
    // Text names a different symbol than the report ticker — trust explicit mention.
    if (bare.length >= 1) return bare[bare.length - 1];
    return report;
  }

  if (bare.length > 0) return bare[bare.length - 1];
  return "";
}

/** Best ticker for Research AI: panel ticker unless the user names another symbol in chat. */
export function resolveComposeTicker(
  messages: { role: string; content: string }[],
  panelTicker?: string,
): string | undefined {
  const panel = panelTicker?.trim().toUpperCase();
  const lastUser = messages.at(-1)?.content ?? "";
  const fromLast = detectTicker(lastUser, panel);
  if (fromLast) return fromLast;

  for (let i = messages.length - 2; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const t = detectTicker(m.content, panel);
    if (t) return t;
  }

  return panel || undefined;
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
