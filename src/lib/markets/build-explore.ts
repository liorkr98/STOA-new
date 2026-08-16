import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listTickerRows } from "@/lib/db/tickers";
import { UNIVERSE } from "@/lib/universe";
import { MARKET_SECTORS, MARKET_THEMES } from "@/lib/markets/themes";
import type {
  CoveredRow,
  ExplorePayload,
  MarketRow,
  NewlyCalledRow,
  SectorTile,
  TapeQuote,
  ThemeCard,
} from "@/lib/markets/types";
import type { Direction, Profile } from "@/lib/types";

const WEEK_MS = 7 * 86_400_000;

/**
 * The tape. These are index and commodity symbols, which the instrument table
 * does not carry (it is equities only), so values stay null and the strip
 * renders labels with reserved slots until an index feed exists.
 */
const TAPE: { label: string; symbol: string }[] = [
  { label: "S&P 500", symbol: "^GSPC" },
  { label: "Nasdaq", symbol: "^IXIC" },
  { label: "TA-35", symbol: "^TA125.TA" },
  { label: "VIX", symbol: "^VIX" },
  { label: "WTI Crude", symbol: "CL=F" },
  { label: "Gold", symbol: "GC=F" },
];

function toRow(
  symbol: string,
  name: string,
  price: number | null,
  marketCap: number | null,
): MarketRow {
  // DAY-CHANGE-PENDING: changePercent stays null on every list surface.
  return { symbol, company: name, price, changePercent: null, marketCap };
}

/** Published report counts per ticker, optionally limited to a recent window. */
async function coverageCounts(since?: Date): Promise<Map<string, number>> {
  const supabase = await createClient();
  let query = supabase
    .from("reports")
    .select("ticker, published_at")
    .in("status", ["published", "resolution_pending_review"])
    .not("ticker", "is", null)
    .limit(2000);
  if (since) query = query.gte("published_at", since.toISOString());

  const { data } = await query;
  const counts = new Map<string, number>();
  for (const row of (data as { ticker: string | null }[]) ?? []) {
    const sym = row.ticker?.toUpperCase();
    if (!sym) continue;
    counts.set(sym, (counts.get(sym) ?? 0) + 1);
  }
  return counts;
}

/** Distinct analysts and open-call lean per ticker. */
async function callActivity(): Promise<
  Map<string, { analysts: Set<string>; long: number; short: number; firstAt: string }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("ticker, author_id, direction, outcome, created_at")
    .order("created_at", { ascending: true })
    .limit(2000);

  const map = new Map<
    string,
    { analysts: Set<string>; long: number; short: number; firstAt: string }
  >();
  for (const row of (data as {
    ticker: string;
    author_id: string;
    direction: Direction;
    outcome: string;
    created_at: string;
  }[]) ?? []) {
    const sym = row.ticker?.toUpperCase();
    if (!sym) continue;
    const entry = map.get(sym) ?? {
      analysts: new Set<string>(),
      long: 0,
      short: 0,
      firstAt: row.created_at,
    };
    entry.analysts.add(row.author_id);
    if (row.outcome === "open") {
      if (row.direction === "long") entry.long += 1;
      if (row.direction === "short") entry.short += 1;
    }
    map.set(sym, entry);
  }
  return map;
}

async function buildThemes(coverageWeek: Map<string, number>): Promise<ThemeCard[]> {
  const symbols = [...new Set(MARKET_THEMES.flatMap((t) => t.tickers))];
  const rows = await listTickerRows(symbols);
  const bySymbol = new Map(rows.map((r) => [r.symbol, r]));

  return MARKET_THEMES.map((theme) => {
    const constituents = theme.tickers.flatMap((sym) => {
      const row = bySymbol.get(sym);
      const fallback = UNIVERSE.find((u) => u.ticker === sym);
      const name = row?.name ?? fallback?.name;
      if (!name) return [];
      return [toRow(sym, name, row?.last_price ?? null, row?.market_cap ?? null)];
    });

    return {
      slug: theme.slug,
      name: theme.name,
      deck: theme.deck,
      constituents,
      publicationsThisWeek: theme.tickers.reduce(
        (sum, sym) => sum + (coverageWeek.get(sym) ?? 0),
        0,
      ),
    };
  });
}

async function buildCovered(
  coverageAll: Map<string, number>,
  coverageWeek: Map<string, number>,
  activity: Awaited<ReturnType<typeof callActivity>>,
  limit: number,
): Promise<CoveredRow[]> {
  const ranked = [...coverageAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (ranked.length === 0) return [];

  const rows = await listTickerRows(ranked.map(([sym]) => sym));
  const bySymbol = new Map(rows.map((r) => [r.symbol, r]));

  return ranked.flatMap(([symbol]) => {
    const row = bySymbol.get(symbol);
    const fallback = UNIVERSE.find((u) => u.ticker === symbol);
    const name = row?.name ?? fallback?.name;
    if (!name) return [];
    const entry = activity.get(symbol);
    return [
      {
        ...toRow(symbol, name, row?.last_price ?? null, row?.market_cap ?? null),
        newPublications: coverageWeek.get(symbol) ?? 0,
        analystCount: entry?.analysts.size ?? 0,
        lean: { long: entry?.long ?? 0, short: entry?.short ?? 0 },
      },
    ];
  });
}

/** Names whose very first Stoa call landed recently. */
async function buildNewlyCalled(limit: number): Promise<NewlyCalledRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select(
      "ticker, direction, created_at, report_id, author:profiles!predictions_author_id_fkey(*)",
    )
    .order("created_at", { ascending: true })
    .limit(2000);

  const rows = (data as unknown as {
    ticker: string;
    direction: Direction;
    created_at: string;
    report_id: string;
    author: Profile | null;
  }[]) ?? [];

  const firstBySymbol = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const sym = row.ticker?.toUpperCase();
    if (!sym || firstBySymbol.has(sym)) continue;
    firstBySymbol.set(sym, row);
  }

  const newest = [...firstBySymbol.entries()]
    .sort((a, b) => b[1].created_at.localeCompare(a[1].created_at))
    .slice(0, limit);
  if (newest.length === 0) return [];

  const tickerRows = await listTickerRows(newest.map(([sym]) => sym));
  const bySymbol = new Map(tickerRows.map((r) => [r.symbol, r]));

  return newest.flatMap(([symbol, first]) => {
    if (!first.author) return [];
    const row = bySymbol.get(symbol);
    const fallback = UNIVERSE.find((u) => u.ticker === symbol);
    const name = row?.name ?? fallback?.name;
    if (!name) return [];
    return [
      {
        ...toRow(symbol, name, row?.last_price ?? null, row?.market_cap ?? null),
        analyst: {
          handle: first.author.handle,
          displayName: first.author.display_name,
          avatarUrl: first.author.avatar_url,
          score: first.author.score || null,
          provisional: (first.author.sample_size ?? 0) < 10,
        },
        direction: first.direction,
        calledAt: first.created_at,
        reportId: first.report_id,
      },
    ];
  });
}

async function buildSectors(coverageAll: Map<string, number>): Promise<SectorTile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickers")
    .select("symbol, sector")
    .eq("status", "active")
    .limit(4000);

  const sectorBySymbol = new Map<string, string>();
  for (const row of (data as { symbol: string; sector: string | null }[]) ?? []) {
    if (row.sector) sectorBySymbol.set(row.symbol.toUpperCase(), row.sector);
  }
  for (const entry of UNIVERSE) {
    if (!sectorBySymbol.has(entry.ticker)) sectorBySymbol.set(entry.ticker, entry.sector);
  }

  const counts = new Map<string, number>(MARKET_SECTORS.map((s) => [s, 0]));
  for (const [symbol, count] of coverageAll) {
    const sector = sectorBySymbol.get(symbol);
    if (!sector || !counts.has(sector)) continue;
    counts.set(sector, (counts.get(sector) ?? 0) + count);
  }

  // DAY-CHANGE-PENDING: a sector-level change needs constituent day changes.
  return MARKET_SECTORS.map((name) => ({
    name,
    publications: counts.get(name) ?? 0,
    changePercent: null,
  }));
}

/** Notable listed names carrying no Stoa coverage at all. */
async function buildUncovered(
  coverageAll: Map<string, number>,
  limit: number,
): Promise<MarketRow[]> {
  const candidates = UNIVERSE.filter((u) => !coverageAll.has(u.ticker)).map((u) => u.ticker);
  if (candidates.length === 0) return [];

  const rows = await listTickerRows(candidates);
  return rows
    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
    .slice(0, limit)
    .map((r) => toRow(r.symbol, r.name, r.last_price, r.market_cap));
}

export async function buildExplore(): Promise<ExplorePayload> {
  const since = new Date(Date.now() - WEEK_MS);
  const [coverageAll, coverageWeek, activity] = await Promise.all([
    coverageCounts(),
    coverageCounts(since),
    callActivity(),
  ]);

  const [themes, covered, newlyCalled, sectors, uncovered] = await Promise.all([
    buildThemes(coverageWeek),
    buildCovered(coverageAll, coverageWeek, activity, 6),
    buildNewlyCalled(4),
    buildSectors(coverageAll),
    buildUncovered(coverageAll, 4),
  ]);

  // DAY-CHANGE-PENDING: index/commodity symbols are not in the instrument
  // table, so both value and change stay reserved until an index feed lands.
  const tape: TapeQuote[] = TAPE.map((t) => ({
    label: t.label,
    symbol: t.symbol,
    value: null,
    changePercent: null,
  }));

  return { tape, themes, covered, newlyCalled, sectors, uncovered };
}
