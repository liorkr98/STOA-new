import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finnhub, MarketDataError } from "@/lib/market";

const LIMIT = 30;
const WINDOW_SEC = 60;

/**
 * Finnhub estimates proxy for estimatesNode hydration (A7): EPS estimates vs
 * actuals + the analyst price-target range. Auth + rate limit keep the key
 * server-side; readers render the cached result baked into the node at publish.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_rate_key: `market-estimates:${user.id}`,
    p_window_seconds: WINDOW_SEC,
    p_max_requests: LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Rate limit exceeded (30/min)" }, { status: 429 });
  }

  const symbol = new URL(req.url).searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const [estimates, priceTarget] = await Promise.all([
      finnhub.getEpsEstimates(symbol),
      finnhub.getPriceTarget(symbol).catch(() => null),
    ]);
    return NextResponse.json(
      { estimates, priceTarget },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (err) {
    if (err instanceof MarketDataError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
