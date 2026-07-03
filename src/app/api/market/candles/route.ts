import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCandles } from "@/lib/engine/market/candles";
import { CHART_RANGES, type ChartRange } from "@/lib/market/candle-types";

const CANDLE_LIMIT = 60;
const CANDLE_WINDOW_SEC = 60;

/**
 * OHLC proxy for chartNode hydration. Auth + rate limit keep market data
 * server-side (yahoo-finance2 never ships to the browser).
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
    p_rate_key: `market-candles:${user.id}`,
    p_window_seconds: CANDLE_WINDOW_SEC,
    p_max_requests: CANDLE_LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Rate limit exceeded (60/min)" }, { status: 429 });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const rangeParam = (url.searchParams.get("range") ?? "3M").toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const range = (CHART_RANGES as string[]).includes(rangeParam)
    ? (rangeParam as ChartRange)
    : "3M";

  const candles = await getCandles(symbol, range);
  return NextResponse.json(
    { symbol, range, candles },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
