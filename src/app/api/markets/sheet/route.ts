import { NextResponse } from "next/server";
import { getStockSnapshot } from "@/lib/engine/market";
import { getCandles } from "@/lib/engine/market/candles";
import { getTickerRow } from "@/lib/db/tickers";
import { buildStockCalls } from "@/lib/markets/build-stock";
import { buildEtfSnapshot } from "@/lib/markets/build-etf";

/**
 * Payload for the instrument sheet: enough to answer "what is this and what
 * does Stoa say about it" without leaving the surface the reader is on.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.toUpperCase();
  if (!symbol || !/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const [calls, candles, etf] = await Promise.all([
    buildStockCalls(symbol),
    getCandles(symbol, "6M"),
    buildEtfSnapshot(symbol),
  ]);

  let name = symbol;
  let price: number | null = null;
  let changePercent: number | null = null;
  let isEtf = false;

  if (etf) {
    isEtf = true;
    name = etf.name;
    price = etf.quote.price;
    changePercent = etf.changePercent;
  } else {
    const [snapshot, meta] = await Promise.all([getStockSnapshot(symbol), getTickerRow(symbol)]);
    name = meta?.name ?? symbol;
    price = snapshot.quote.price;
    changePercent = snapshot.changePercent;
  }

  return NextResponse.json({
    symbol,
    name,
    isEtf,
    price,
    changePercent,
    candles,
    openCalls: calls.openCalls,
    resolvedCalls: calls.resolvedCalls,
    coverage: calls.coverage,
  });
}
