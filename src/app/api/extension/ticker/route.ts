import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/http/errors";
import { withCache } from "@/lib/cache";
import { normaliseTicker } from "@/lib/interest-cart/cart";
import { extensionPreflight } from "@/lib/extension/cors";
import { extensionRoute } from "@/lib/extension/http";
import { tickerInfo } from "@/lib/extension/ticker-info";

/** GET ?symbol=JPM: the card's line and the More info panel, from the existing market data. */
export function GET(req: NextRequest) {
  return extensionRoute(req, { limit: { name: "extension-ticker", limit: 240, windowSeconds: 60 } }, async () => {
    const symbol = normaliseTicker(new URL(req.url).searchParams.get("symbol") ?? "");
    if (!symbol) throw new ApiError("bad_request", "symbol required");
    const info = await withCache(`extension-ticker:${symbol}`, 30, () => tickerInfo(symbol));
    return NextResponse.json(info, { headers: { "Cache-Control": "private, max-age=30" } });
  });
}

export function OPTIONS(req: NextRequest) {
  return extensionPreflight(req, "GET");
}
