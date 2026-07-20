import { NextResponse } from "next/server";
import { finnhub, MarketDataError } from "@/lib/market";
import { withHandler } from "@/lib/http/handler";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Public company-news endpoint for the ticker page. Uses a short lookback
 * window and returns a capped list to keep payloads small.
 */
async function handleNews(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const to = new Date();
  const from = new Date(Date.now() - 14 * 86_400_000);

  try {
    const items = await withCache(cacheKeys.marketNews(ticker), 300, () =>
      finnhub.getCompanyNews(ticker, ymd(from), ymd(to)),
    );
    return NextResponse.json(
      { ticker, items: items.slice(0, 12) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    if (error instanceof MarketDataError) {
      return NextResponse.json({ ticker, items: [], error: error.message }, { status: 200 });
    }
    throw error;
  }
}

export const GET = withHandler(
  {
    route: "GET /api/market/news",
    auth: "none",
    rateLimit: { name: "market-news", limit: 120, windowSeconds: 60, by: "ip" },
  },
  ({ req }) => handleNews(req),
);
