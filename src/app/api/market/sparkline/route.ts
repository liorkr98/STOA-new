import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { withHandler } from "@/lib/http/handler";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const GET = withHandler(
  {
    route: "GET /api/market/sparkline",
    auth: "none",
    rateLimit: { name: "market-sparkline", limit: 120, windowSeconds: 60, by: "ip" },
  },
  async ({ req }) => {
    const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase() ?? "SPY";
    try {
      const points = await withCache(cacheKeys.marketSparkline(ticker), 3600, async () => {
        const end = Math.floor(Date.now() / 1000);
        const start = end - 180 * 86_400;
        const history = await yf.chart(ticker, { period1: start, period2: end, interval: "1d" });
        const quotes = history.quotes?.filter((q) => q.close != null) ?? [];
        return quotes.slice(-30).map((q) => q.close as number);
      });
      return NextResponse.json({ ticker, points });
    } catch {
      return NextResponse.json({ ticker, points: [] });
    }
  },
);
