import "server-only";

import { getQuote } from "@/lib/engine/market";
import { getTickerRow } from "@/lib/db/tickers";
import { formatMacroLevel, macroInstrument } from "@/lib/markets/instruments";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";
import { price as fmtPrice } from "@/lib/format";

/**
 * What the compose call block learns about a symbol the creator typed.
 *
 * A call is graded against a live price, so "recognised" means the same thing
 * here that it means at publish: the symbol is a listed name Stoa knows, or
 * one of the macro instruments, and it can be priced. A symbol that fails
 * both is a typo as far as the record is concerned, and the block says so
 * before the creator gets anywhere near the publish button.
 */
export interface ResolvedSymbol {
  /** The symbol as Stoa writes it, upper-cased. */
  symbol: string;
  found: boolean;
  /** The company, or the instrument's name. Null when unknown. */
  name: string | null;
  kind: "equity" | "commodity" | "rate" | "crypto";
  exchange: string | null;
  /** How the level is read, e.g. "$ / oz" or "% yield". Null for an equity. */
  unit: string | null;
  /** The live level, which is what a call would lock at. */
  price: number | null;
  /** The level printed the way the instrument is read: "$178.20", "4.215%". */
  priceLabel: string | null;
  /** Treasury tenors: the level is a yield, and "up" means bond prices fall. */
  quotedAsYield: boolean;
  directionNote: string | null;
}

/** Symbols are letters, digits and the few marks providers use. Anything else is not worth a round trip. */
const SYMBOL_SHAPE = /^[A-Z0-9][A-Z0-9.\-=^]{0,11}$/;

function quoteFor(symbol: string) {
  return withCache(cacheKeys.marketQuote(symbol), 15, () => getQuote(symbol));
}

/**
 * Listing names arrive with the exchange feed's trailing punctuation
 * ("NVIDIA Corporation -"), which is not how anyone says the name.
 */
function tidyName(name: string | null | undefined): string | null {
  const clean = (name ?? "").replace(/[\s\-–—,]+$/u, "").trim();
  return clean || null;
}

export async function resolveSymbol(raw: string): Promise<ResolvedSymbol> {
  const symbol = raw.trim().toUpperCase();
  const nothing: ResolvedSymbol = {
    symbol,
    found: false,
    name: null,
    kind: "equity",
    exchange: null,
    unit: null,
    price: null,
    priceLabel: null,
    quotedAsYield: false,
    directionNote: null,
  };
  if (!SYMBOL_SHAPE.test(symbol)) return nothing;

  const macro = macroInstrument(symbol);
  if (macro) {
    const quote = await quoteFor(macro.symbol).catch(() => null);
    const price = quote?.available ? quote.price : null;
    return {
      symbol: macro.symbol,
      found: true,
      name: macro.name,
      kind: macro.kind,
      exchange: null,
      unit: macro.unit,
      price,
      priceLabel: formatMacroLevel(macro, price),
      quotedAsYield: macro.kind === "rate",
      directionNote: macro.directionNote ?? null,
    };
  }

  const [row, quote] = await Promise.all([
    getTickerRow(symbol).catch(() => null),
    quoteFor(symbol).catch(() => null),
  ]);
  const listed = row !== null && row.status === "active";
  const price = quote?.available ? quote.price : null;
  if (!listed && price == null) return nothing;
  return {
    ...nothing,
    found: true,
    name: tidyName(row?.name),
    exchange: row?.exchange ?? null,
    price,
    priceLabel: price != null ? `$${fmtPrice(price)}` : null,
  };
}
