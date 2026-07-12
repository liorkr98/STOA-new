#!/usr/bin/env node
/**
 * Prints SQL upserts for US listings (for MCP / SQL editor when service role is unavailable).
 */
const NASDAQ_URL = "https://nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_URL = "https://nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const CHUNK = 400;

function esc(s: string) {
  return s.replace(/'/g, "''");
}

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[./]/g, "-");
}

function cleanName(name: string): string {
  return name
    .replace(/\s+-\s+Class [A-Z].*$/i, "")
    .replace(/\s+Common Stock$/i, "")
    .replace(/\s+Ordinary Shares$/i, "")
    .trim();
}

async function fetchListings() {
  const [nasdaqText, otherText] = await Promise.all([
    fetch(NASDAQ_URL).then((r) => r.text()),
    fetch(OTHER_URL).then((r) => r.text()),
  ]);
  const map = new Map<string, { symbol: string; name: string; exchange: string }>();

  for (const line of nasdaqText.split("\n").slice(1)) {
    if (!line.trim() || line.startsWith("File")) continue;
    const [symbol, name, , testIssue, , , etf] = line.split("|");
    if (!symbol || testIssue === "Y" || etf === "Y") continue;
    const sym = normalizeSymbol(symbol);
    if (!/^[A-Z][A-Z0-9-]{0,9}$/.test(sym)) continue;
    map.set(sym, { symbol: sym, name: cleanName(name ?? sym), exchange: "NASDAQ" });
  }

  for (const line of otherText.split("\n").slice(1)) {
    if (!line.trim() || line.startsWith("File")) continue;
    const [symbol, name, exchangeCode, , etf, , testIssue] = line.split("|");
    if (!symbol || testIssue === "Y" || etf === "Y") continue;
    const sym = normalizeSymbol(symbol);
    if (!/^[A-Z][A-Z0-9-]{0,9}$/.test(sym)) continue;
    const exchange =
      exchangeCode === "N"
        ? "NYSE"
        : exchangeCode === "A"
          ? "AMEX"
          : exchangeCode === "P"
            ? "ARCA"
            : exchangeCode === "Z"
              ? "BATS"
              : "NYSE";
    map.set(sym, { symbol: sym, name: cleanName(name ?? sym), exchange });
  }

  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

async function main() {
  const listings = await fetchListings();
  console.error(`-- ${listings.length} listings`);

  for (let i = 0; i < listings.length; i += CHUNK) {
    const slice = listings.slice(i, i + CHUNK);
    const values = slice
      .map(
        (l) =>
          `('${esc(l.symbol)}', '${esc(l.name)}', null, '${esc(l.exchange)}', 'America/New_York', 'active')`,
      )
      .join(",\n");
    console.log(`insert into tickers (symbol, name, sector, exchange, timezone, status)
values
${values}
on conflict (symbol) do update set
  name = excluded.name,
  exchange = excluded.exchange,
  status = 'active',
  updated_at = now();`);
  }
}

main();
