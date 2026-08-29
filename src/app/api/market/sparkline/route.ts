import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { withHandler } from "@/lib/http/handler";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface SparkSeries {
  ticker: string;
  points: number[];
  series: { t: number; v: number }[];
}

async function loadSpark(ticker: string): Promise<SparkSeries> {
  return withCache(cacheKeys.marketSparkline(ticker), 3600, async () => {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 180 * 86_400;
    const history = await yf.chart(ticker, { period1: start, period2: end, interval: "1d" });
    const quotes = history.quotes?.filter((q) => q.close != null) ?? [];
    const sliced = quotes.slice(-90);
    const series = sliced
      .map((q) => {
        const raw = q.date instanceof Date ? q.date.getTime() : new Date(q.date).getTime();
        if (!Number.isFinite(raw) || q.close == null) return null;
        return { t: Math.floor(raw / 1000), v: q.close as number };
      })
      .filter((p): p is { t: number; v: number } => p != null);
    return { ticker, points: series.map((s) => s.v), series };
  });
}

export const GET = withHandler(
  {
    route: "GET /api/market/sparkline",
    auth: "none",
    rateLimit: { name: "market-sparkline", limit: 120, windowSeconds: 60, by: "ip" },
  },
  async ({ req }) => {
    const url = new URL(req.url);
    const ticker = url.searchParams.get("ticker")?.toUpperCase() ?? "SPY";
    const compareRaw = url.searchParams.get("compare")?.toUpperCase() ?? "";
    try {
      const primary = await loadSpark(ticker);
      let compare: SparkSeries | null = null;
      if (compareRaw && compareRaw !== ticker) {
        try {
          compare = await loadSpark(compareRaw);
        } catch {
          compare = null;
        }
      }
      return NextResponse.json({ ...primary, compare });
    } catch {
      return NextResponse.json({ ticker, points: [], series: [], compare: null });
    }
  },
);
