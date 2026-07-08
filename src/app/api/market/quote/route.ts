import { NextResponse } from "next/server";
import { getQuote } from "@/lib/engine/market";

export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase();
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
  const quote = await getQuote(ticker);
  return NextResponse.json({
    symbol: quote.symbol,
    price: quote.price,
    available: quote.available,
    source: quote.source,
  });
}
