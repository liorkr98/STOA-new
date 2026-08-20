import "server-only";
import YahooFinance from "yahoo-finance2";
import { cached } from "./cache";
import type { NewsItem } from "./types";

/**
 * Wire news from Yahoo Finance, used as quiet context on Today, Markets and
 * instrument pages. Deliberately separate from Stoa research: every item is
 * marked with its source so the two are never confused. On any failure the
 * list is empty and the caller hides the band; nothing is invented.
 */

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});

const NEWS_TTL = 10 * 60_000;

interface YahooNews {
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: string | Date | number;
}

function toItem(n: YahooNews): NewsItem | null {
  if (!n.title || !n.link) return null;
  const t = n.providerPublishTime;
  const datetime =
    t instanceof Date ? t.toISOString() : typeof t === "number" ? new Date(t * (t < 1e12 ? 1000 : 1)).toISOString() : t ?? "";
  return { headline: n.title, summary: null, source: n.publisher ?? "Yahoo Finance", url: n.link, datetime, sentiment: null };
}

async function search(query: string, count: number): Promise<NewsItem[]> {
  try {
    const res = (await yahooFinance.search(query, { newsCount: count, quotesCount: 0 })) as { news?: YahooNews[] };
    const items = (res.news ?? []).map(toItem).filter((n): n is NewsItem => Boolean(n));
    const seen = new Set<string>();
    return items.filter((n) => (seen.has(n.url) ? false : (seen.add(n.url), true)));
  } catch {
    return [];
  }
}

/** General market headlines for the Market News band. */
export async function getMarketNews(limit = 12): Promise<NewsItem[]> {
  return cached(`yahoo:news:market:${limit}`, NEWS_TTL, async () => {
    const [a, b] = await Promise.all([search("stock market today", limit), search("Wall Street", limit)]);
    const seen = new Set<string>();
    return [...a, ...b]
      .filter((n) => (seen.has(n.url) ? false : (seen.add(n.url), true)))
      .sort((x, y) => Date.parse(y.datetime) - Date.parse(x.datetime))
      .slice(0, limit);
  });
}

/** Ticker-specific headlines for an instrument page. */
export async function getTickerNews(symbol: string, limit = 8): Promise<NewsItem[]> {
  const sym = symbol.toUpperCase();
  return cached(`yahoo:news:${sym}:${limit}`, NEWS_TTL, () => search(sym, limit));
}
