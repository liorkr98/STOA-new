import "server-only";

import { getCandles } from "@/lib/engine/market/candles";
import { getCompanyProfile } from "@/lib/engine/market/profile";
import { getStockSnapshot } from "@/lib/engine/market";
import { getTickerRow } from "@/lib/db/tickers";
import { finnhub } from "@/lib/market";
import { analystsCovering } from "@/lib/markets/coverage";
import { ETFS } from "@/lib/extension/detect/aliases";
import { displayName } from "@/lib/extension/detect/resolve";

/** What the card and the More info panel show for one ticker. Mirrored in extension/src/lib/types.ts. */
export type TickerInfo = {
  symbol: string;
  name: string;
  industry: string | null;
  etf: boolean;
  price: number | null;
  /** Today's move in percent. */
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  low52: number | null;
  high52: number | null;
  nextEarnings: string | null;
  description: string | null;
  /** Daily closes over three months, oldest first. */
  closes: number[];
  analysts: number;
};

async function liveQuote(sym: string): Promise<{ price: number | null; changePercent: number | null }> {
  try {
    const q = await finnhub.getLiveQuote(sym);
    return { price: q.price, changePercent: q.percentChange ?? null };
  } catch {
    return { price: null, changePercent: null };
  }
}

export async function tickerInfo(symbol: string): Promise<TickerInfo> {
  const sym = symbol.toUpperCase();
  const [row, quote, snapshot, profile, candles, analysts] = await Promise.all([
    getTickerRow(sym).catch(() => null),
    liveQuote(sym),
    getStockSnapshot(sym).catch(() => null),
    getCompanyProfile(sym),
    getCandles(sym, "3M").catch(() => []),
    analystsCovering(sym).catch(() => 0),
  ]);
  const price = quote.price ?? (snapshot?.quote.available ? snapshot.quote.price : null);
  return {
    symbol: sym,
    name: row?.name ? displayName(row.name) : (ETFS[sym] ?? sym),
    industry: profile.industry ?? row?.sector ?? null,
    etf: profile.isEtf || Boolean(ETFS[sym]),
    price,
    changePercent: quote.changePercent ?? snapshot?.changePercent ?? null,
    marketCap: snapshot?.fundamentals.marketCap ?? row?.market_cap ?? null,
    pe: snapshot?.fundamentals.peRatio ?? null,
    low52: snapshot?.fiftyTwoWeekLow ?? null,
    high52: snapshot?.fiftyTwoWeekHigh ?? null,
    nextEarnings: profile.nextEarnings,
    description: profile.description,
    closes: candles.map((c) => c.close).filter((n) => Number.isFinite(n)),
    analysts,
  };
}
