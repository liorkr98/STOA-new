import "server-only";
import { getQuote } from "@/lib/engine/market";
import { finnhub, MarketDataError } from "@/lib/market";

export interface ComposeMarketContext {
  ticker: string;
  price: number | null;
  available: boolean;
  source?: string;
  news: { headline: string; datetime?: string | null; source?: string | null; url?: string }[];
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Fast quote + recent headlines for Research AI (fail soft). */
export async function loadComposeMarketContext(
  ticker: string | undefined,
): Promise<ComposeMarketContext | null> {
  const sym = ticker?.trim().toUpperCase();
  if (!sym || sym.length > 10) return null;

  const quotePromise = getQuote(sym).catch(() => null);
  const newsPromise = (async () => {
    try {
      const to = new Date();
      const from = new Date(Date.now() - 14 * 86_400_000);
      const items = await finnhub.getCompanyNews(sym, ymd(from), ymd(to));
      return items.slice(0, 6).map((n) => ({
        headline: n.headline,
        datetime: n.datetime,
        source: n.source,
        url: n.url,
      }));
    } catch (e) {
      if (e instanceof MarketDataError) return [];
      return [];
    }
  })();

  const [quote, news] = await Promise.all([quotePromise, newsPromise]);
  return {
    ticker: sym,
    price: quote?.price ?? null,
    available: Boolean(quote?.available && quote.price != null),
    source: quote?.source,
    news,
  };
}

export function formatMarketContextXml(ctx: ComposeMarketContext): string {
  const newsLines =
    ctx.news.length === 0
      ? "none"
      : ctx.news
          .map((n, i) => `${i + 1}. ${n.headline}${n.source ? ` (${n.source})` : ""}`)
          .join("\n");
  return `<market_context>
ticker: ${ctx.ticker}
price: ${ctx.available && ctx.price != null ? ctx.price : "unavailable"}
source: ${ctx.source ?? "none"}
recent_headlines:
${newsLines}
</market_context>`;
}
