/**
 * Macro instruments: the tracked, callable things that are not equities.
 *
 * Stoa is an equities platform, so everything here is a deliberate exception
 * rather than the start of an asset-class sprawl. Gold and oil set the input
 * cost of half the listed universe, Treasury yields set the discount rate
 * under all of it, and bitcoin is included because it now trades as a macro
 * asset rather than as a currency. That last one is the single crypto
 * exception on the platform: there is no general crypto coverage and this
 * file is not the place to add one.
 *
 * Symbols are the TradingView convention (XAUUSD, USOIL, US10Y, BTCUSD)
 * rather than the bare words a reader might reach for first. GOLD and WTI are
 * both real, listed equities already in the instrument table (Gold.com and
 * W&T Offshore), so using them here would shadow a company page and make an
 * analyst's call ambiguous about what they actually called.
 *
 * `providerSymbol` is what the data provider is asked for and never appears
 * in a URL or in front of a reader.
 */

export type MacroKind = "commodity" | "rate" | "crypto";

export interface MacroInstrument {
  /** The Stoa symbol: the URL, the search hit, and what a call block accepts. */
  symbol: string;
  /** What the quote and candle providers are asked for. */
  providerSymbol: string;
  name: string;
  kind: MacroKind;
  /** The bucket this sits in for tags and theme membership. */
  sector: string;
  /** How a level is read, e.g. "$ / oz" or "% yield". */
  unit: string;
  /** Decimals when a level is printed. */
  precision: number;
  /**
   * What a reader is likely to type. Nobody searches "XAUUSD" for gold, so a
   * symbol built for correctness needs the plain words attached to it.
   */
  keywords: string[];
  /** A short editorial line: what this is and why Stoa tracks it. */
  about: string;
  /**
   * Set where "up" does not mean "worth more". A yield rising is a bond
   * price falling, and a call block that does not say so invites an analyst
   * to pick the direction opposite to the one they mean.
   */
  directionNote?: string;
}

export const MACRO_INSTRUMENTS: MacroInstrument[] = [
  {
    symbol: "XAUUSD",
    providerSymbol: "GC=F",
    name: "Gold",
    kind: "commodity",
    sector: "Commodities",
    unit: "$ / oz",
    precision: 2,
    keywords: ["gold", "bullion", "precious metals", "xau"],
    about:
      "The oldest reserve asset, and the one that moves when confidence in the others does. Gold trades against real yields and the dollar rather than against earnings, which is why it belongs on a research platform that otherwise talks about companies. The level tracked here is the front-month futures contract.",
  },
  {
    symbol: "USOIL",
    providerSymbol: "CL=F",
    name: "WTI Crude",
    kind: "commodity",
    sector: "Commodities",
    unit: "$ / bbl",
    precision: 2,
    keywords: ["oil", "crude", "wti", "west texas", "energy", "petroleum"],
    about:
      "West Texas Intermediate: the American benchmark barrel, priced at Cushing, Oklahoma. It sets the revenue line for every domestic producer and the cost line for the refiners, airlines and chemical makers that buy from them. The level tracked here is the front-month futures contract.",
  },
  {
    symbol: "UKOIL",
    providerSymbol: "BZ=F",
    name: "Brent Crude",
    kind: "commodity",
    sector: "Commodities",
    unit: "$ / bbl",
    precision: 2,
    keywords: ["oil", "crude", "brent", "energy", "petroleum", "north sea"],
    about:
      "The seaborne benchmark, and the barrel most of the world actually pays for. Brent carries geopolitical risk earlier and more sharply than WTI because it prices cargoes that have to cross water. The spread between the two is itself a read on where the disruption is.",
  },
  {
    symbol: "US10Y",
    providerSymbol: "^TNX",
    name: "US 10-Year Treasury Yield",
    kind: "rate",
    sector: "Rates",
    unit: "% yield",
    precision: 3,
    keywords: ["treasury", "treasuries", "bond", "bonds", "yield", "10 year", "ten year", "rates", "tnx"],
    about:
      "The discount rate under every long-duration asset on the platform. When the ten-year moves, the present value of distant earnings moves with it, which is why a growth multiple and a Treasury auction are the same conversation.",
    directionNote:
      "This instrument is quoted as a yield. A call for the level to rise is a call for bond prices to fall.",
  },
  {
    symbol: "US30Y",
    providerSymbol: "^TYX",
    name: "US 30-Year Treasury Yield",
    kind: "rate",
    sector: "Rates",
    unit: "% yield",
    precision: 3,
    keywords: ["treasury", "treasuries", "bond", "bonds", "yield", "30 year", "thirty year", "long bond", "rates"],
    about:
      "The long bond: the market's view on inflation and fiscal credibility far past any current forecast. It moves less on the next meeting than on whether the debt path is believed.",
    directionNote:
      "This instrument is quoted as a yield. A call for the level to rise is a call for bond prices to fall.",
  },
  {
    symbol: "US05Y",
    providerSymbol: "^FVX",
    name: "US 5-Year Treasury Yield",
    kind: "rate",
    sector: "Rates",
    unit: "% yield",
    precision: 3,
    keywords: ["treasury", "treasuries", "bond", "bonds", "yield", "5 year", "five year", "rates"],
    about:
      "The belly of the curve, where policy expectations and inflation expectations meet. It is the tenor that moves most on a change in what the central bank is expected to do next year rather than next month.",
    directionNote:
      "This instrument is quoted as a yield. A call for the level to rise is a call for bond prices to fall.",
  },
  {
    symbol: "BTCUSD",
    providerSymbol: "BTC-USD",
    name: "Bitcoin",
    kind: "crypto",
    sector: "Macro",
    unit: "$",
    precision: 2,
    keywords: ["bitcoin", "btc", "crypto"],
    about:
      "Included as a macro asset, not as the start of crypto coverage. Bitcoin now trades against liquidity and real yields closely enough that an analyst writing about either has reason to reference it. Stoa does not cover crypto generally, and this is the single exception.",
  },
];

const BY_SYMBOL = new Map(MACRO_INSTRUMENTS.map((i) => [i.symbol, i]));
const BY_PROVIDER = new Map(MACRO_INSTRUMENTS.map((i) => [i.providerSymbol.toUpperCase(), i]));

/** The macro instrument for a Stoa symbol, or null when it is an equity. */
export function macroInstrument(symbol: string | null | undefined): MacroInstrument | null {
  if (!symbol) return null;
  return BY_SYMBOL.get(symbol.trim().toUpperCase()) ?? null;
}

export function isMacroSymbol(symbol: string | null | undefined): boolean {
  return macroInstrument(symbol) !== null;
}

/**
 * Stoa symbol -> provider symbol. Everything else passes through unchanged,
 * so this is safe to call on the whole of any symbol list.
 */
export function toProviderSymbol(symbol: string): string {
  return macroInstrument(symbol)?.providerSymbol ?? symbol;
}

/** Provider symbol -> Stoa symbol, for mapping a quote back to what was asked. */
export function fromProviderSymbol(symbol: string): string {
  return BY_PROVIDER.get(symbol.trim().toUpperCase())?.symbol ?? symbol;
}

/** How a macro level is printed. Equities keep the ordinary price format. */
export function formatMacroLevel(instrument: MacroInstrument, value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const n = value.toLocaleString("en-US", {
    minimumFractionDigits: instrument.precision,
    maximumFractionDigits: instrument.precision,
  });
  return instrument.kind === "rate" ? `${n}%` : `$${n}`;
}

/**
 * Macro instruments matching a typeahead query. Symbol, name and the plain
 * words a reader actually types all match, so "gold" finds XAUUSD and
 * "treasuries" finds all three tenors.
 */
export function searchMacroInstruments(query: string): MacroInstrument[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MACRO_INSTRUMENTS.filter(
    (i) =>
      i.symbol.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}

/**
 * How a level reads in a list beside ordinary share prices.
 *
 * A Treasury yield printed as a bare number next to a fund's price reads as a
 * price, which is exactly the confusion the instrument pages go out of their
 * way to avoid. Returns null when the symbol is not a macro instrument, so the
 * caller keeps its usual price formatting.
 */
export function macroLevelLabel(symbol: string, value: number | null): string | null {
  const inst = macroInstrument(symbol);
  if (!inst) return null;
  return formatMacroLevel(inst, value);
}
