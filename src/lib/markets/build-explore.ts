import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listTickerRows } from "@/lib/db/tickers";
import { UNIVERSE } from "@/lib/universe";
import { MARKET_SECTORS, MARKET_THEMES } from "@/lib/markets/themes";
import { CURATED_ETFS, ETF_BAND_SIZE } from "@/lib/markets/etfs";
import { getQuotesBatch } from "@/lib/engine/market";
import { callActivity, coverageAllTime, coverageWindow } from "@/lib/markets/coverage";
import type { Quote } from "@/lib/engine/market/types";
import type {
  CoveredRow,
  EtfBandRow,
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
 * The tape: major indices, key commodities, volatility, then the most-covered
 * tickers on Stoa. Levels come live from the quote provider (Yahoo carries
 * indices and futures); an index that returns nothing keeps a reserved slot.
 * Indices click through to the fund that tracks them, since an index itself
 * has no instrument page.
 */
const TAPE_FIXED: { label: string; symbol: string; href: string | null }[] = [
  { label: "S&P 500", symbol: "^GSPC", href: "/markets/SPY" },
  { label: "Nasdaq", symbol: "^IXIC", href: "/markets/QQQ" },
  { label: "Dow", symbol: "^DJI", href: "/markets/DIA" },
  { label: "Russell 2000", symbol: "^RUT", href: "/markets/IWM" },
  { label: "TA-35", symbol: "TA35.TA", href: null },
  { label: "VIX", symbol: "^VIX", href: "/markets/VXX" },
  { label: "WTI Crude", symbol: "CL=F", href: "/markets/XLE" },
  { label: "Gold", symbol: "GC=F", href: "/markets/GLD" },
  { label: "10Y Treasury", symbol: "^TNX", href: "/markets/TLT" },
];
const TAPE_COVERED = 8;

function toRow(
  symbol: string,
  name: string,
  price: number | null,
  marketCap: number | null,
): MarketRow {
  // The live quote overlay (applyQuotes) fills price and changePercent when
  // the provider returns them; until then the change slot stays reserved.
  return { symbol, company: name, price, changePercent: null, marketCap };
}

/** Overlay live quotes onto rows built from the instrument table. */
function applyQuotes<T extends MarketRow>(rows: T[], quotes: Map<string, Quote>): T[] {
  return rows.map((r) => {
    const q = quotes.get(r.symbol.toUpperCase());
    if (!q) return r;
    return { ...r, price: q.price ?? r.price, changePercent: q.changePercent ?? r.changePercent };
  });
}

/**
 * Coverage and call activity are grouped in Postgres and cached; see
 * src/lib/markets/coverage.ts. Both used to be 2000-row scans reduced in Node,
 * and Markets ran four of them per request.
 */
const coverageCounts = (since?: Date, until?: Date) =>
  since || until ? coverageWindow(since, until) : coverageAllTime();

async function buildThemes(coverageWeek: Map<string, number>, coverageLastWeek: Map<string, number>): Promise<ThemeCard[]> {
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
      publicationsLastWeek: theme.tickers.reduce(
        (sum, sym) => sum + (coverageLastWeek.get(sym) ?? 0),
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
        analystCount: entry?.analysts ?? 0,
        openCalls: (entry?.long ?? 0) + (entry?.short ?? 0),
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
        },
        direction: first.direction,
        calledAt: first.created_at,
        reportId: first.report_id,
      },
    ];
  });
}

async function buildSectors(coverageAll: Map<string, number>): Promise<SectorTile[]> {
  // Only the covered symbols need a sector lookup. This used to scan up to 4000
  // ticker rows to build a map of which a couple of dozen entries were read.
  const coveredSymbols = [...coverageAll.keys()];
  const rows = coveredSymbols.length ? await listTickerRows(coveredSymbols) : [];

  const sectorBySymbol = new Map<string, string>();
  for (const row of rows) {
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


function tapeFrom(quotes: Map<string, Quote>, mostCovered: string[]): TapeQuote[] {
  return [
    ...TAPE_FIXED.map((t) => ({
      label: t.label,
      symbol: t.symbol,
      href: t.href,
      value: quotes.get(t.symbol.toUpperCase())?.price ?? null,
      changePercent: quotes.get(t.symbol.toUpperCase())?.changePercent ?? null,
    })),
    ...mostCovered.map((sym) => ({
      label: sym,
      symbol: sym,
      href: `/markets/${sym}`,
      value: quotes.get(sym)?.price ?? null,
      changePercent: quotes.get(sym)?.changePercent ?? null,
    })),
  ];
}

/** The tape alone (landing page, other surfaces): indices, commodities, then the most-covered names. */
export async function buildTape(): Promise<TapeQuote[]> {
  const coverageAll = await coverageCounts();
  const mostCovered = [...coverageAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, TAPE_COVERED).map(([s]) => s.toUpperCase());
  const quotes = await getQuotesBatch([...TAPE_FIXED.map((t) => t.symbol), ...mostCovered], { fetchBenchmark: false }).catch(
    () => new Map<string, Quote>(),
  );
  return tapeFrom(quotes, mostCovered);
}

export async function buildExplore(): Promise<ExplorePayload> {
  const since = new Date(Date.now() - WEEK_MS);
  const twoWeeksAgo = new Date(Date.now() - 2 * WEEK_MS);
  const [coverageAll, coverageWeek, coverageLastWeek, activity] = await Promise.all([
    coverageCounts(),
    coverageCounts(since),
    coverageCounts(twoWeeksAgo, since),
    callActivity(),
  ]);

  const [themesRaw, coveredRaw, newlyCalledRaw, sectors, uncoveredRaw] = await Promise.all([
    buildThemes(coverageWeek, coverageLastWeek),
    buildCovered(coverageAll, coverageWeek, activity, 6),
    buildNewlyCalled(4),
    buildSectors(coverageAll),
    buildUncovered(coverageAll, 4),
  ]);

  const mostCovered = [...coverageAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, TAPE_COVERED).map(([s]) => s.toUpperCase());
  const rowSymbols = [
    ...themesRaw.flatMap((t) => t.constituents.map((c) => c.symbol)),
    ...coveredRaw.map((r) => r.symbol),
    ...newlyCalledRaw.map((r) => r.symbol),
    ...uncoveredRaw.map((r) => r.symbol),
  ];
  const quotes = await getQuotesBatch([...TAPE_FIXED.map((t) => t.symbol), ...mostCovered, ...rowSymbols], { fetchBenchmark: false }).catch(
    () => new Map<string, Quote>(),
  );

  const themes = themesRaw.map((t) => ({ ...t, constituents: applyQuotes(t.constituents, quotes) }));
  const covered = applyQuotes(coveredRaw, quotes);
  const newlyCalled = applyQuotes(newlyCalledRaw, quotes);
  const uncovered = applyQuotes(uncoveredRaw, quotes);

  const tape = tapeFrom(quotes, mostCovered);

  // Featured funds are curated; their Stoa activity is read from real data.
  const etfs: EtfBandRow[] = CURATED_ETFS.map((e) => ({
    symbol: e.symbol,
    name: e.name,
    publications: coverageAll.get(e.symbol) ?? 0,
  }))
    .sort((a, b) => b.publications - a.publications)
    .slice(0, ETF_BAND_SIZE);

  return { tape, themes, covered, newlyCalled, sectors, uncovered, etfs };
}
