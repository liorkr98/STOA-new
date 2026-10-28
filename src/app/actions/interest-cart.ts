"use server";

import { listTickerRows } from "@/lib/db/tickers";
import { getCandles } from "@/lib/engine/market/candles";
import { normaliseTicker } from "@/lib/interest-cart/cart";
import { weekMove } from "@/lib/interest-cart/price";
import { shortName } from "@/lib/extension/names";
import { getVerifiedSessionEmail } from "@/lib/db/auth";
import { interestCartFlag, interestCartOpenTo } from "@/lib/flags/interest-cart";

export type CartTickerInfo = { name: string | null; weekMovePct: number | null };

const MAX_TICKERS = 40;

/**
 * Whether the Interest Cart exists for this reader (FEATURE_INTEREST_CART).
 * Off: no, without touching the session, and the browser need not ask again.
 * On: yes for everyone. Allowlist: the account is verified with Supabase,
 * and the browser asks again after navigating, so signing in picks it up.
 */
export async function interestCartAccess(): Promise<{ open: boolean; recheck: boolean }> {
  const flag = interestCartFlag();
  if (flag.state !== "allowlist") return { open: interestCartOpenTo(null, flag), recheck: false };
  return { open: interestCartOpenTo(await getVerifiedSessionEmail(), flag), recheck: true };
}

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
  if (!(await interestCartAccess()).open) return {};
  const symbols = [...new Set(tickers.map(normaliseTicker).filter((t): t is string => Boolean(t)))].slice(0, MAX_TICKERS);
  if (symbols.length === 0 || Number.isNaN(Date.parse(fromIso)) || Number.isNaN(Date.parse(toIso))) return {};

  const [rows, moves] = await Promise.all([
    listTickerRows(symbols).catch(() => []),
    Promise.all(
      symbols.map(async (s) => [s, weekMove(await getCandles(s, "3M").catch(() => []), fromIso, toIso)] as const),
    ),
  ]);
  // The same short names the extension shows ("JPMorgan Chase", "Nvidia").
  const names = new Map(rows.map((r) => [r.symbol, r.name ? shortName(r.symbol, r.name) : null]));
  return Object.fromEntries(
    moves.map(([s, pct]) => [s, { name: names.get(s) ?? null, weekMovePct: pct }]),
  );
}
