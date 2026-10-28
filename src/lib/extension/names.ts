/**
 * Short display names: "Goldman Sachs", not "Goldman Sachs Group, Inc.
 * (The)". The listing's name is cleaned by rule; the overrides cover common
 * names the rule cannot shorten well (brands, abbreviations, odd listings).
 */
export const SHORT_NAMES: Record<string, string> = {
  AAPL: "Apple",
  AMD: "AMD",
  AMZN: "Amazon",
  AVGO: "Broadcom",
  BAC: "Bank of America",
  "BRK.A": "Berkshire Hathaway",
  "BRK.B": "Berkshire Hathaway",
  C: "Citigroup",
  CAKE: "Cheesecake Factory",
  CEG: "Constellation Energy",
  CRWD: "CrowdStrike",
  DIS: "Disney",
  GOOG: "Alphabet",
  GOOGL: "Alphabet",
  GS: "Goldman Sachs",
  JPM: "JPMorgan Chase",
  KHC: "Kraft Heinz",
  LLY: "Eli Lilly",
  MA: "Mastercard",
  MCD: "McDonald's",
  META: "Meta",
  MS: "Morgan Stanley",
  MSFT: "Microsoft",
  NICE: "NICE",
  NVDA: "Nvidia",
  ORCL: "Oracle",
  PLTR: "Palantir",
  TSLA: "Tesla",
  TSM: "TSMC",
  V: "Visa",
  WFC: "Wells Fargo",
  XLB: "Materials Select Sector SPDR",
  XLF: "Financial Select Sector SPDR",
  XLV: "Health Care Select Sector SPDR",
};

const TAIL = /[\s,]+(?:inc|incorporated|corp|corporation|co|company|companies|ltd|limited|plc|llc|lp|nv|n\.v|sa|s\.a|ag|se|holdings?|group|class [a-c]|common stock|ordinary shares|adr|ads)\.?$/i;

/** The rule alone, for names without an override. */
export function cleanName(listed: string): string {
  let name = (listed.split(/\s+[-–]\s+/)[0] ?? listed)
    .replace(/\s*[-–]\s*$/, "")
    .replace(/\s*\((?:the|[a-z]{2,4})\)\s*$/i, "")
    .replace(/^the\s+/i, "")
    .replace(/[\s,]+(?:american depositary|sponsored adr|ordinary shares|common stock|common shares).*$/i, "")
    .trim();
  for (let i = 0; i < 4; i++) {
    const next = name.replace(TAIL, "").replace(/[\s,&]+$/, "").trim();
    if (next === name || !next) break;
    name = next;
  }
  return name || listed.trim();
}

export function shortName(ticker: string, listed: string): string {
  return SHORT_NAMES[ticker.toUpperCase()] ?? cleanName(listed);
}
