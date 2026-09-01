import "server-only";

import { listTickerRows } from "@/lib/db/tickers";
import { getProfilesByIds } from "@/lib/db/profiles";
import { UNIVERSE } from "@/lib/universe";
import { MARKET_SECTORS, MARKET_THEMES } from "@/lib/markets/themes";
import { isMacroSymbol } from "@/lib/markets/instruments";
import { CURATED_ETFS, ETF_BAND_SIZE } from "@/lib/markets/etfs";
import { getQuotesBatch } from "@/lib/engine/market";
import { callActivity, coverageAllTime, coverageWindow, firstCallsRecent } from "@/lib/markets/coverage";
import { cachedPage } from "@/lib/cache/page";
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
  // Gold, crude, the ten-year and bitcoin are tracked instruments in their own
  // right now, so these click through to their own pages rather than to the
  // fund that used to stand in for them.
  { label: "WTI Crude", symbol: "USOIL", href: "/markets/USOIL" },
  { label: "Brent Crude", symbol: "UKOIL", href: "/markets/UKOIL" },
  { label: "Gold", symbol: "XAUUSD", href: "/markets/XAUUSD" },
  { label: "10Y Treasury", symbol: "US10Y", href: "/markets/US10Y" },
  { label: "30Y Treasury", symbol: "US30Y", href: "/markets/US30Y" },
  { label: "Bitcoin", symbol: "BTCUSD", href: "/markets/BTCUSD" },
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
  const firsts = await firstCallsRecent(limit);
  if (firsts.length === 0) return [];

  const [authors, tickerRows] = await Promise.all([
    getProfilesByIds([...new Set(firsts.map((f) => f.authorId))]),
    listTickerRows(firsts.map((f) => f.symbol)),
  ]);
  const byAuthor = new Map(authors.map((p) => [p.id, p]));
  const bySymbol = new Map(tickerRows.map((r) => [r.symbol, r]));

  return firsts.flatMap((first) => {
    const author = byAuthor.get(first.authorId);
    if (!author) return [];
    const row = bySymbol.get(first.symbol);
    const fallback = UNIVERSE.find((u) => u.ticker === first.symbol);
    const name = row?.name ?? fallback?.name;
    if (!name) return [];
    return [
      {
        ...toRow(first.symbol, name, row?.last_price ?? null, row?.market_cap ?? null),
        analyst: {
          handle: author.handle,
          displayName: author.display_name,
          avatarUrl: author.avatar_url,
        },
        direction: first.direction,
        calledAt: first.calledAt,
        reportId: first.reportId,
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

  // A sector tile carries Stoa coverage only. A sector-level day change needs
  // constituent day changes weighted into an index, which the quote path does
  // not provide; the tile no longer reserves a slot for one.
  return MARKET_SECTORS.map((name) => ({
    name,
    publications: counts.get(name) ?? 0,
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
    ...TAPE_FIXED.flatMap((t) => {
      const q = quotes.get(t.symbol.toUpperCase());
      // An index keeps its slot while the provider is quiet, because the slot
      // is the tape's shape. A macro instrument does not: Stoa claims to track
      // it, so a level we cannot stand behind is left out rather than shown
      // empty.
      if (!q?.price && isMacroSymbol(t.symbol)) return [];
      return [
        {
          label: t.label,
          symbol: t.symbol,
          href: t.href,
          value: q?.price ?? null,
          changePercent: q?.changePercent ?? null,
        },
      ];
    }),
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
  return cachedPage("markets-tape", 20, buildTapeUncached);
}

async function buildTapeUncached(): Promise<TapeQuote[]> {
  const fixedP = getQuotesBatch(
    TAPE_FIXED.map((t) => t.symbol),
    { fetchBenchmark: false },
  ).catch(() => new Map<string, Quote>());
  const coverageAll = await coverageCounts();
  const mostCovered = [...coverageAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, TAPE_COVERED).map(([s]) => s.toUpperCase());
  const [fixed, rest] = await Promise.all([
    fixedP,
    mostCovered.length
      ? getQuotesBatch(mostCovered, { fetchBenchmark: false }).catch(() => new Map<string, Quote>())
      : Promise.resolve(new Map<string, Quote>()),
  ]);
  const quotes = rest.size ? new Map([...fixed, ...rest]) : fixed;
  return tapeFrom(quotes, mostCovered);
}

export async function buildExplore(): Promise<ExplorePayload> {
  return cachedPage("markets-explore", 20, buildExploreUncached);
}

async function buildExploreUncached(): Promise<ExplorePayload> {
  const minute = 60_000;
  const since = new Date(Math.floor((Date.now() - WEEK_MS) / minute) * minute);
  const twoWeeksAgo = new Date(Math.floor((Date.now() - 2 * WEEK_MS) / minute) * minute);
  const knownSymbols = [
    ...TAPE_FIXED.map((t) => t.symbol),
    ...MARKET_THEMES.flatMap((t) => t.tickers),
    ...CURATED_ETFS.map((e) => e.symbol),
  ];
  const knownQuotesP = getQuotesBatch(knownSymbols, { fetchBenchmark: false }).catch(
    () => new Map<string, Quote>(),
  );

  const [coverageAll, coverageWeek, coverageLastWeek, activity, knownQuotes] = await Promise.all([
    coverageCounts(),
    coverageCounts(since),
    coverageCounts(twoWeeksAgo, since),
    callActivity(),
    knownQuotesP,
  ]);

  const mostCovered = [...coverageAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, TAPE_COVERED).map(([s]) => s.toUpperCase());

  const [themesRaw, coveredRaw, newlyCalledRaw, sectors, uncoveredRaw] = await Promise.all([
    buildThemes(coverageWeek, coverageLastWeek),
    buildCovered(coverageAll, coverageWeek, activity, 6),
    buildNewlyCalled(4),
    buildSectors(coverageAll),
    buildUncovered(coverageAll, 4),
  ]);

  const extraSymbols = [
    ...mostCovered,
    ...coveredRaw.map((r) => r.symbol),
    ...newlyCalledRaw.map((r) => r.symbol),
    ...uncoveredRaw.map((r) => r.symbol),
  ].filter((s) => !knownQuotes.has(s.toUpperCase()));
  const extraQuotes = extraSymbols.length
    ? await getQuotesBatch(extraSymbols, { fetchBenchmark: false }).catch(() => new Map<string, Quote>())
    : new Map<string, Quote>();
  const quotes = extraQuotes.size ? new Map([...knownQuotes, ...extraQuotes]) : knownQuotes;

  const themes = themesRaw.map((t) => ({ ...t, constituents: applyQuotes(t.constituents, quotes) }));
  const covered = applyQuotes(coveredRaw, quotes);
  const newlyCalled = applyQuotes(newlyCalledRaw, quotes);
  const uncovered = applyQuotes(uncoveredRaw, quotes);

  const tape = tapeFrom(quotes, mostCovered);

  // Featured funds are curated; their Stoa activity is read from real data, and
  // the day change comes from `knownQuotes`, which already batches every curated
  // symbol. Funds carrying coverage lead; the rest are ordered by the curation.
  const etfs: EtfBandRow[] = CURATED_ETFS.map((e) => ({
    symbol: e.symbol,
    name: e.name,
    publications: coverageAll.get(e.symbol) ?? 0,
    changePercent: quotes.get(e.symbol.toUpperCase())?.changePercent ?? null,
  }))
    .sort((a, b) => b.publications - a.publications)
    .slice(0, ETF_BAND_SIZE);

  return { tape, themes, covered, newlyCalled, sectors, uncovered, etfs };
}
