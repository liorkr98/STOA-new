import { ALIASES, ETFS, ETF_ALIASES } from "@/lib/extension/detect/aliases";

/** One listed symbol, as the resolver needs it. */
export type SymbolEntry = { symbol: string; name: string; exchange: string; marketCap: number | null };

export type Resolved = { ticker: string; name: string; etf: boolean };

const SUFFIXES = new Set([
  "inc", "incorporated", "corp", "corporation", "co", "company", "companies", "ltd", "limited", "plc", "group",
  "holdings", "holding", "nv", "sa", "ag", "se", "the", "class", "a", "b", "c", "common", "stock", "shares", "ordinary",
  "llc", "lp", "trust", "adr", "ads", "de", "&",
]);

/**
 * A company name reduced to the words that identify it: lower case, the
 * listing's trailing " - Common Stock ..." cut off, punctuation and legal
 * suffixes (Inc, Corporation, Ltd, Class A) removed. Hebrew is kept as is.
 */
export function normaliseName(raw: string): string {
  const cut = raw.split(/\s+-\s+|\s+–\s+/)[0] ?? raw;
  const words = cut
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/(?<=\p{L})'s\b/gu, "s")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1]!)) words.pop();
  while (words.length > 1 && words[0] === "the") words.shift();
  return words.join(" ");
}

const US = new Set(["NYSE", "NASDAQ", "AMEX"]);

function better(a: SymbolEntry, b: SymbolEntry): SymbolEntry {
  if (US.has(a.exchange) !== US.has(b.exchange)) return US.has(a.exchange) ? a : b;
  return (a.marketCap ?? 0) >= (b.marketCap ?? 0) ? a : b;
}

/**
 * Maps the company the AI says is being discussed to a listed ticker, in
 * code. Order: the alias table, an exact match on the listed name, then the
 * largest listed company whose name starts with the words heard. Anything
 * else is dropped rather than guessed.
 */
export function createResolver(symbols: SymbolEntry[]) {
  const bySymbol = new Map(symbols.map((s) => [s.symbol, s]));
  const byName = new Map<string, SymbolEntry>();
  for (const s of symbols) {
    const key = normaliseName(s.name);
    if (!key) continue;
    const seen = byName.get(key);
    byName.set(key, seen ? better(seen, s) : s);
  }
  const names = [...byName.entries()];

  const entry = (ticker: string, etf = false): Resolved | null => {
    if (ETFS[ticker]) return { ticker, name: ETFS[ticker]!, etf: true };
    const s = bySymbol.get(ticker);
    return s ? { ticker: s.symbol, name: displayName(s.name), etf } : null;
  };

  function byWords(key: string): Resolved | null {
    const alias = ETF_ALIASES[key] ?? ALIASES[key];
    if (alias) return entry(alias);
    if (key.length < 3) return null;
    const exact = byName.get(key);
    if (exact) return entry(exact.symbol);
    const etf = Object.entries(ETFS).find(([, n]) => normaliseName(n) === key);
    if (etf) return entry(etf[0]);
    if (key.length < 4) return null;
    let best: SymbolEntry | null = null;
    for (const [name, s] of names) {
      if (name.startsWith(`${key} `) && (!best || better(best, s) === s)) best = s;
    }
    return best ? entry(best.symbol) : null;
  }

  return function resolve(company: string, heardAs: string): Resolved | null {
    for (const raw of [company, heardAs]) {
      const hit = byWords(normaliseName(raw));
      if (hit) return hit;
    }
    return null;
  };
}

export type Resolver = ReturnType<typeof createResolver>;

/** "NICE Ltd - American Depositary Shares ..." to "NICE Ltd". */
export function displayName(listed: string): string {
  return (listed.split(/\s+-\s+|\s+–\s+/)[0] ?? listed)
    .replace(/\s*-\s*$/, "")
    .replace(/\s*\(The\)\s*$/i, "")
    .trim();
}
