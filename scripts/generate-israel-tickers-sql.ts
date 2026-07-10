#!/usr/bin/env node
/** Prints SQL upserts for Israeli tickers (pipe to Supabase SQL editor / MCP). */
const MAYA_URL = "https://api.tase.co.il/api/content/searchentities?lang=1";
const TARGET = 1200;
const CHUNK = 200;

const EXCLUDED = new Set([
  "Corporate Bonds",
  "Government Bonds",
  "Treasury Bill",
  "Corporate Bonds TASE UP",
]);

function esc(s: string) {
  return s.replace(/'/g, "''");
}

function toTaseYahooSymbol(smb: string): string {
  const base = smb.trim().toUpperCase().replace(/[./]/g, "-");
  return base.endsWith(".TA") ? base : `${base}.TA`;
}

function priority(subTypeDesc: string): number {
  const d = subTypeDesc.toLowerCase();
  if (d.includes("share")) return 0;
  if (d.includes("etf") && d.includes("equity")) return 1;
  if (d.includes("etf")) return 2;
  if (d.includes("participating")) return 3;
  if (d.includes("convertible")) return 4;
  if (d.includes("warrant")) return 5;
  return 6;
}

async function fetchAdanosExtras(existing: Set<string>) {
  const res = await fetch(
    "https://raw.githubusercontent.com/adanos-software/free-ticker-database/main/data/listings.csv",
  );
  if (!res.ok) return [];
  const out: { symbol: string; name: string; prio: number }[] = [];
  for (const line of (await res.text()).split("\n").slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 6) continue;
    const [, ticker, exchange, name, assetType] = parts;
    if (exchange !== "TASE" || assetType !== "Stock") continue;
    const symbol = toTaseYahooSymbol(ticker);
    if (existing.has(symbol)) continue;
    existing.add(symbol);
    out.push({ symbol, name: name.trim(), prio: 0 });
  }
  return out;
}

async function main() {
  const res = await fetch(MAYA_URL, {
    headers: {
      Referer: "https://www.tase.co.il/",
      "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Maya API ${res.status}`);
  const data = (await res.json()) as {
    Smb?: string | null;
    Name?: string;
    Type?: number;
    SubTypeDesc?: string;
  }[];

  const rows = data
    .filter((r) => r.Smb && r.Type === 1 && !EXCLUDED.has(r.SubTypeDesc ?? ""))
    .map((r) => ({
      symbol: toTaseYahooSymbol(String(r.Smb)),
      name: String(r.Name ?? r.Smb).trim(),
      prio: priority(r.SubTypeDesc ?? ""),
    }));

  const existing = new Set(rows.map((r) => r.symbol));
  rows.push(...(await fetchAdanosExtras(existing)));

  const sorted = rows.sort((a, b) => a.prio - b.prio || a.symbol.localeCompare(b.symbol)).slice(0, TARGET);

  console.error(`-- ${sorted.length} Israeli listings`);
  for (let i = 0; i < sorted.length; i += CHUNK) {
    const slice = sorted.slice(i, i + CHUNK);
    const values = slice
      .map((r) => `('${esc(r.symbol)}', '${esc(r.name)}', null, 'TASE', 'Asia/Jerusalem', 'active')`)
      .join(",\n");
    console.log(`insert into tickers (symbol, name, sector, exchange, timezone, status)
values
${values}
on conflict (symbol) do update set
  name = excluded.name,
  exchange = 'TASE',
  timezone = 'Asia/Jerusalem',
  status = 'active',
  updated_at = now();`);
  }
}

main();
