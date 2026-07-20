import { NextResponse } from "next/server";
import { getQuote } from "@/lib/engine/market";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";

export const GET = withHandler(
  {
    route: "GET /api/market/quote",
    auth: "none",
    rateLimit: { name: "market-quote", limit: 120, windowSeconds: 60, by: "ip" },
  },
  async ({ req }) => {
    const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase();
    if (!ticker) throw new ApiError("bad_request", "ticker required");
    const quote = await withCache(cacheKeys.marketQuote(ticker), 15, () => getQuote(ticker));
    return NextResponse.json({
      symbol: quote.symbol,
      price: quote.price,
      available: quote.available,
      source: quote.source,
    });
  },
);
