import { NextResponse } from "next/server";
import { fmp, MarketDataError } from "@/lib/market";
import { withHandler } from "@/lib/http/handler";

/**
 * Peer set for compose templates / comparison blocks (FMP). Fail soft without a key.
 */
async function handlePeers(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const set = await fmp.getPeers(ticker);
    const peers = (set.peers ?? [])
      .map((p) => p.toUpperCase())
      .filter((p) => p && p !== ticker)
      .slice(0, 5);
    return NextResponse.json(
      { ticker, peers },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (e) {
    if (e instanceof MarketDataError) {
      return NextResponse.json({ ticker, peers: [], error: e.message }, { status: 200 });
    }
    return NextResponse.json({ ticker, peers: [] }, { status: 200 });
  }
}

export const GET = withHandler(
  {
    route: "GET /api/market/peers",
    auth: "none",
    rateLimit: { name: "market-peers", limit: 120, windowSeconds: 60, by: "ip" },
  },
  ({ req }) => handlePeers(req),
);
