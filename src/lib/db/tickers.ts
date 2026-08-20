import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CapBand } from "@/lib/market/cap-bands";
import { UNIVERSE, type UniverseEntry } from "@/lib/universe";

export type TickerRow = {
  symbol: string;
  name: string;
  sector: string | null;
  exchange: string;
  timezone: string;
  status: string;
  last_price: number | null;
  market_cap: number | null;
  cap_band: CapBand | null;
  metrics_updated_at: string | null;
};

export type MarketTickerListOptions = {
  page?: number;
  limit?: number;
  search?: string;
  capBand?: CapBand;
  sort?: "coverage" | "symbol" | "market_cap";
};

const DEFAULT_LIMIT = 48;

function admin() {
  return createAdminClient();
}

/** Tickers in a cap band for Discover filtering (DB-backed). */
export async function tickersInCapBand(band: CapBand): Promise<string[]> {
  try {
    const db = admin();
    const { data } = await db
      .from("tickers")
      .select("symbol")
      .eq("status", "active")
      .eq("cap_band", band);
    if (data && data.length > 0) {
      return data.map((r) => r.symbol as string);
    }
  } catch {
    // Pre-migration fallback below.
  }
  return UNIVERSE.filter((u) => u.capBand === band).map((u) => u.ticker);
}

export async function capBandForTicker(ticker: string | null | undefined): Promise<CapBand | null> {
  if (!ticker) return null;
  const sym = ticker.toUpperCase();
  try {
    const db = admin();
    const { data } = await db.from("tickers").select("cap_band").eq("symbol", sym).maybeSingle();
    if (data?.cap_band) return data.cap_band as CapBand;
  } catch {
    // fall through
  }
  return UNIVERSE.find((u) => u.ticker === sym)?.capBand ?? null;
}

export const getTickerRow = cache(async (symbol: string): Promise<TickerRow | null> => {
  const sym = symbol.toUpperCase();
  try {
    const db = await createClient();
    const { data } = await db.from("tickers").select("*").eq("symbol", sym).maybeSingle();
    if (data) return data as TickerRow;
  } catch {
    // fall through
  }
  const featured = UNIVERSE.find((u) => u.ticker === sym);
  if (!featured) return null;
  return {
    symbol: featured.ticker,
    name: featured.name,
    sector: featured.sector,
    exchange: featured.exchange,
    timezone: "America/New_York",
    status: "active",
    last_price: null,
    market_cap: null,
    cap_band: featured.capBand,
    metrics_updated_at: null,
  };
});

/** Batch form of getTickerRow, for surfaces that resolve a whole watchlist. */
export async function listTickerRows(symbols: string[]): Promise<TickerRow[]> {
  const wanted = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (wanted.length === 0) return [];

  let rows: TickerRow[] = [];
  try {
    const db = await createClient();
    const { data } = await db.from("tickers").select("*").in("symbol", wanted);
    rows = (data as TickerRow[]) ?? [];
  } catch {
    // fall through to the static universe
  }

  const found = new Set(rows.map((r) => r.symbol));
  for (const sym of wanted) {
    if (found.has(sym)) continue;
    const featured = UNIVERSE.find((u) => u.ticker === sym);
    if (!featured) continue;
    rows.push({
      symbol: featured.ticker,
      name: featured.name,
      sector: featured.sector,
      exchange: featured.exchange,
      timezone: "America/New_York",
      status: "active",
      last_price: null,
      market_cap: null,
      cap_band: featured.capBand,
      metrics_updated_at: null,
    });
  }

  return wanted.flatMap((sym) => rows.filter((r) => r.symbol === sym));
}

export async function listMarketTickers(
  options: MarketTickerListOptions = {},
): Promise<{ rows: TickerRow[]; total: number; metricsUpdatedAt: string | null }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const db = await createClient();
    let q = db
      .from("tickers")
      .select("*", { count: "exact" })
      .eq("status", "active");

    if (options.capBand) q = q.eq("cap_band", options.capBand);
    if (options.search?.trim()) {
      const term = options.search.trim().toUpperCase();
      q = q.or(`symbol.ilike.%${term}%,name.ilike.%${options.search.trim()}%`);
    }

    if (options.sort === "market_cap") {
      q = q.order("market_cap", { ascending: false, nullsFirst: false });
    } else if (options.sort === "symbol") {
      q = q.order("symbol", { ascending: true });
    } else {
      q = q.order("symbol", { ascending: true });
    }

    const { data, count, error } = await q.range(from, to);
    if (error) throw error;

    const { data: freshness } = await db
      .from("tickers")
      .select("metrics_updated_at")
      .eq("status", "active")
      .not("metrics_updated_at", "is", null)
      .order("metrics_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      rows: (data ?? []) as TickerRow[],
      total: count ?? 0,
      metricsUpdatedAt: (freshness?.metrics_updated_at as string | null) ?? null,
    };
  } catch {
    const featured = UNIVERSE.map(
      (u): TickerRow => ({
        symbol: u.ticker,
        name: u.name,
        sector: u.sector,
        exchange: u.exchange,
        timezone: "America/New_York",
        status: "active",
        last_price: null,
        market_cap: null,
        cap_band: u.capBand,
        metrics_updated_at: null,
      }),
    );
    return { rows: featured.slice(from, from + limit), total: featured.length, metricsUpdatedAt: null };
  }
}

export async function listSectorPeers(sector: string, exclude: string, limit = 6): Promise<TickerRow[]> {
  try {
    const db = await createClient();
    const { data } = await db
      .from("tickers")
      .select("*")
      .eq("status", "active")
      .eq("sector", sector)
      .neq("symbol", exclude.toUpperCase())
      .order("market_cap", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (data && data.length > 0) return data as TickerRow[];
  } catch {
    // fall through
  }
  return UNIVERSE.filter((u) => u.sector === sector && u.ticker !== exclude.toUpperCase())
    .slice(0, limit)
    .map(
      (u): TickerRow => ({
        symbol: u.ticker,
        name: u.name,
        sector: u.sector,
        exchange: u.exchange,
        timezone: "America/New_York",
        status: "active",
        last_price: null,
        market_cap: null,
        cap_band: u.capBand,
        metrics_updated_at: null,
      }),
    );
}

export function featuredUniverseEntry(ticker: string): UniverseEntry | undefined {
  return UNIVERSE.find((u) => u.ticker === ticker.toUpperCase());
}
