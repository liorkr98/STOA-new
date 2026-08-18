import { NextResponse } from "next/server";
import { listTickerRows } from "@/lib/db/tickers";
import { getQuotesBatch } from "@/lib/engine/market";
import { countPublicationsThisCycle } from "@/lib/today/build-today";
import type { TodayTicker } from "@/lib/today/types";

const MAX_SYMBOLS = 12;

/**
 * Resolves the reader's watchlist for the Your Tickers band. The watchlist
 * itself is browser-local (there is no `watchlists` table yet), so the symbols
 * arrive from the client and only the market and coverage facts are looked up
 * here.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) return NextResponse.json({ tickers: [] });

  const [rows, counts, quotes] = await Promise.all([
    listTickerRows(symbols),
    countPublicationsThisCycle(symbols),
    getQuotesBatch(symbols, { fetchBenchmark: false }).catch(() => new Map()),
  ]);

  const bySymbol = new Map(rows.map((r) => [r.symbol, r]));
  const tickers: TodayTicker[] = symbols.map((symbol) => {
    const row = bySymbol.get(symbol);
    return {
      symbol,
      company: row?.name ?? null,
      price: quotes.get(symbol)?.price ?? row?.last_price ?? null,
      changePercent: quotes.get(symbol)?.changePercent ?? null,
      publicationsToday: counts.get(symbol) ?? 0,
    };
  });

  return NextResponse.json({ tickers });
}
