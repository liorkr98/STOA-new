import { NextResponse } from "next/server";
import { getCandles } from "@/lib/engine/market/candles";
import { CHART_RANGES, type ChartRange } from "@/lib/market/candle-types";

export async function GET(req: Request) {
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
  return NextResponse.json({ symbol, range, candles });
}
