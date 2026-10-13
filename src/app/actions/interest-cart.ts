"use server";

import { listTickerRows } from "@/lib/db/tickers";
import { getCandles } from "@/lib/engine/market/candles";
import { normaliseTicker } from "@/lib/interest-cart/cart";
import { weekMove } from "@/lib/interest-cart/price";
import { companyName } from "@/lib/format";

export type CartTickerInfo = { name: string | null; weekMovePct: number | null };

const MAX_TICKERS = 40;

/**
 * Company names and each ticker's price move over one cart week, for the
 * cart's rows. Market data only: nothing here reads or writes a tap. Daily
 * bars for the last three months (already cached per symbol), so a week
 * older than that shows no price rather than a wrong one.
 */
export async function cartTickerInfo(
  tickers: string[],
  fromIso: string,
  toIso: string,
): Promise<Record<string, CartTickerInfo>> {
  const symbols = [...new Set(tickers.map(normaliseTicker).filter((t): t is string => Boolean(t)))].slice(0, MAX_TICKERS);
  if (symbols.length === 0 || Number.isNaN(Date.parse(fromIso)) || Number.isNaN(Date.parse(toIso))) return {};

  const [rows, moves] = await Promise.all([
    listTickerRows(symbols).catch(() => []),
    Promise.all(
      symbols.map(async (s) => [s, weekMove(await getCandles(s, "3M").catch(() => []), fromIso, toIso)] as const),
    ),
  ]);
  const names = new Map(rows.map((r) => [r.symbol, companyName(r.name)]));
  return Object.fromEntries(
    moves.map(([s, pct]) => [s, { name: names.get(s) ?? null, weekMovePct: pct }]),
  );
}
