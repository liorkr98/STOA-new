import { NextResponse } from "next/server";
import { finnhub, MarketDataError } from "@/lib/market";
import { getTickerNews } from "@/lib/market/yahoo-news";

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Public company-news endpoint for instrument pages. Yahoo Finance first (no
 * key required); Finnhub as a fallback when configured. Capped and cached so
 * payloads stay small.
 */
export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }
  const headers = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

  const yahoo = await getTickerNews(ticker, 12);
  if (yahoo.length > 0) {
    return NextResponse.json({ ticker, items: yahoo, source: "yahoo" }, { headers });
  }

  const to = new Date();
  const from = new Date(Date.now() - 14 * 86_400_000);
  try {
    const items = await finnhub.getCompanyNews(ticker, ymd(from), ymd(to));
    return NextResponse.json({ ticker, items: items.slice(0, 12), source: "finnhub" }, { headers });
  } catch (error) {
    if (error instanceof MarketDataError) {
      return NextResponse.json({ ticker, items: [], error: error.message }, { status: 200 });
    }
    throw error;
  }
}
