#!/usr/bin/env node
/**
 * Imports ~7k US common stocks from NASDAQ Trader symbol directories into `tickers`.
 *
 *   pnpm import:tickers
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";

const NASDAQ_URL = "https://nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_URL = "https://nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const UPSERT_BATCH = 400;

type Listing = { symbol: string; name: string; exchange: string };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

async function fetchListings(): Promise<Listing[]> {
  const [nasdaqText, otherText] = await Promise.all([
    fetch(NASDAQ_URL).then((r) => r.text()),
    fetch(OTHER_URL).then((r) => r.text()),
  ]);

  const map = new Map<string, Listing>();

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
  console.log(`Fetched ${listings.length} US listings (non-ETF, non-test).`);

  const db = admin();
  let upserted = 0;

  for (let i = 0; i < listings.length; i += UPSERT_BATCH) {
    const batch = listings.slice(i, i + UPSERT_BATCH).map((l) => ({
      symbol: l.symbol,
      name: l.name,
      sector: null,
      exchange: l.exchange,
      timezone: "America/New_York",
      status: "active",
      updated_at: new Date().toISOString(),
    }));

    const { error } = await db.from("tickers").upsert(batch, { onConflict: "symbol" });
    if (error) throw new Error(error.message);
    upserted += batch.length;
    console.log(`Upserted ${upserted}/${listings.length}`);
  }

  const { count } = await db
    .from("tickers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  console.log(`Done. Active tickers in DB: ${count ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
