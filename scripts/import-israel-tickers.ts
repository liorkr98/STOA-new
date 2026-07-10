#!/usr/bin/env node
/**
 * Imports Israeli (TASE) traded securities from the Maya search API.
 * Targets ~1,200 equity-like listings (shares, ETFs, units, convertibles, warrants).
 *
 *   pnpm import:tickers:il
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const MAYA_URL = "https://api.tase.co.il/api/content/searchentities?lang=1";
const ADANOS_LISTINGS =
  "https://raw.githubusercontent.com/adanos-software/free-ticker-database/main/data/listings.csv";
const HF_ISRAEL =
  "https://huggingface.co/datasets/ThunderDrag/Israel-Stock-Symbols-and-Metadata/resolve/main/israel.csv";
const TARGET = 1200;
const UPSERT_BATCH = 300;

const EXCLUDED_SUBTYPES = new Set([
  "Corporate Bonds",
  "Government Bonds",
  "Treasury Bill",
  "Corporate Bonds TASE UP",
]);

type Listing = {
  symbol: string;
  name: string;
  sector: string | null;
  exchange: "TASE";
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

async function fetchMaya(): Promise<Listing[]> {
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

  return data
    .filter((r) => r.Smb && r.Type === 1 && !EXCLUDED_SUBTYPES.has(r.SubTypeDesc ?? ""))
    .map((r) => ({
      symbol: toTaseYahooSymbol(String(r.Smb)),
      name: String(r.Name ?? r.Smb).trim(),
      sector: null,
      exchange: "TASE" as const,
      _prio: priority(r.SubTypeDesc ?? ""),
    }))
    .sort((a, b) => a._prio - b._prio || a.symbol.localeCompare(b.symbol))
    .map(({ symbol, name, sector, exchange }) => ({ symbol, name, sector, exchange }));
}

async function fetchAdanosExtras(existing: Set<string>): Promise<Listing[]> {
  const res = await fetch(ADANOS_LISTINGS);
  if (!res.ok) return [];
  const text = await res.text();
  const out: Listing[] = [];
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 6) continue;
    const [, ticker, exchange, name, assetType, sector] = parts;
    if (exchange !== "TASE" || assetType !== "Stock") continue;
    const symbol = toTaseYahooSymbol(ticker);
    if (existing.has(symbol)) continue;
    out.push({ symbol, name, sector: sector || null, exchange: "TASE" });
    existing.add(symbol);
  }
  return out;
}

async function fetchHfExtras(existing: Set<string>): Promise<Listing[]> {
  const res = await fetch(HF_ISRAEL);
  if (!res.ok) return [];
  const text = await res.text();
  const out: Listing[] = [];
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const [name, ticker, market, sector] = line.split(",");
    if (market !== "TASE" || !ticker) continue;
    const symbol = toTaseYahooSymbol(ticker);
    if (existing.has(symbol)) continue;
    out.push({ symbol, name: name?.trim() || ticker, sector: sector?.trim() || null, exchange: "TASE" });
    existing.add(symbol);
  }
  return out;
}

function loadCache(): Listing[] | null {
  const path = resolve(process.cwd(), "data/tase/maya-securities.json");
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    Smb?: string | null;
    Name?: string;
    Type?: number;
    SubTypeDesc?: string;
  }[];
  return data
    .filter((r) => r.Smb && r.Type === 1 && !EXCLUDED_SUBTYPES.has(r.SubTypeDesc ?? ""))
    .map((r) => ({
      symbol: toTaseYahooSymbol(String(r.Smb)),
      name: String(r.Name ?? r.Smb).trim(),
      sector: null,
      exchange: "TASE" as const,
      _prio: priority(r.SubTypeDesc ?? ""),
    }))
    .sort((a, b) => a._prio - b._prio || a.symbol.localeCompare(b.symbol))
    .map(({ symbol, name, sector, exchange }) => ({ symbol, name, sector, exchange }));
}

async function buildListings(): Promise<Listing[]> {
  let maya: Listing[];
  try {
    maya = await fetchMaya();
  } catch (err) {
    console.warn("Maya fetch failed, trying local cache:", err instanceof Error ? err.message : err);
    maya = loadCache() ?? [];
  }

  const map = new Map<string, Listing>();
  for (const row of maya) map.set(row.symbol, row);

  const extras = await Promise.all([
    fetchAdanosExtras(new Set(map.keys())),
    fetchHfExtras(new Set(map.keys())),
  ]);
  for (const row of [...extras[0], ...extras[1]]) map.set(row.symbol, row);

  const sorted = [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  return sorted.slice(0, TARGET);
}

async function main() {
  const listings = await buildListings();
  console.log(`Prepared ${listings.length} Israeli listings (target ${TARGET}).`);

  const db = admin();
  let upserted = 0;

  for (let i = 0; i < listings.length; i += UPSERT_BATCH) {
    const batch = listings.slice(i, i + UPSERT_BATCH).map((l) => ({
      symbol: l.symbol,
      name: l.name,
      sector: l.sector,
      exchange: l.exchange,
      timezone: "Asia/Jerusalem",
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
    .eq("exchange", "TASE")
    .eq("status", "active");
  console.log(`Done. Active TASE tickers in DB: ${count ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
