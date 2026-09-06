import { NextResponse } from "next/server";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";
import { resolveSymbol } from "@/lib/market/resolve-symbol";

/**
 * Is this symbol something a call can be locked on, and what is it?
 *
 * The compose call block asks this as the creator types, so the answer has to
 * be cheap: the quote behind it is the same 15-second cached quote the rest
 * of the site reads, and the listing row is cached for five minutes.
 */
export const GET = withHandler(
  {
    route: "GET /api/market/resolve",
    auth: "none",
    rateLimit: { name: "market-resolve", limit: 120, windowSeconds: 60, by: "ip" },
  },
  async ({ req }) => {
    const ticker = new URL(req.url).searchParams.get("ticker")?.trim();
    if (!ticker) throw new ApiError("bad_request", "ticker required");
    return NextResponse.json(await resolveSymbol(ticker));
  },
);
