import { NextResponse } from "next/server";
import { getQuotesBatch } from "@/lib/engine/market";
import { getCandles } from "@/lib/engine/market/candles";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";

const MAX = 40;

/**
 * Batch quotes (and optional 30-day closes) for watchlist/dashboard.
 * Those pages used to fire one request per ticker.
 */
async function handleQuotes(req: Request) {
  const raw = new URL(req.url).searchParams.get("tickers") ?? "";
  const tickers = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.=^-]{1,12}$/.test(s)),
    ),
  ].slice(0, MAX);
  if (tickers.length === 0) {
    throw new ApiError("bad_request", "tickers required");
  }

  const wantSparks = new URL(req.url).searchParams.get("sparks") === "1";
  const [quotes, sparks] = await Promise.all([
    getQuotesBatch(tickers, { fetchBenchmark: false }).catch(() => new Map()),
    wantSparks
      ? Promise.all(
          tickers.map(async (t) => {
            const bars = await getCandles(t, "1M").catch(() => []);
            return [t, bars.slice(-30).map((b) => b.close)] as const;
          }),
        )
      : Promise.resolve([] as const),
  ]);

  return NextResponse.json(
    {
      quotes: Object.fromEntries(
        tickers.map((t) => {
          const q = quotes.get(t);
          return [t, { price: q?.price ?? null, changePercent: q?.changePercent ?? null }];
        }),
      ),
      points: Object.fromEntries(sparks),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
      },
    },
  );
}

export const GET = withHandler(
  {
    route: "GET /api/market/quotes",
    auth: "none",
    rateLimit: { name: "market-quote", limit: 120, windowSeconds: 60, by: "ip" },
  },
  ({ req }) => handleQuotes(req),
);
