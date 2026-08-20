import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { listTickerRows } from "@/lib/db/tickers";
import { followedAnalystIds } from "@/lib/db/social";
import { getQuotesBatch } from "@/lib/engine/market";
import { UNIVERSE } from "@/lib/universe";
import { MARKET_SECTORS } from "@/lib/markets/themes";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { cachedPage } from "@/lib/cache/page";
import type { MarketRow } from "@/lib/markets/types";
import type { TodayItem } from "@/lib/today/types";
import type { Prediction, Profile, Report } from "@/lib/types";

const WEEK_MS = 7 * 86_400_000;

export interface SectorName extends MarketRow {
  publications: number;
  /** Coverage volume, not a stance: open calls on this name. */
  openCalls: number;
}

export interface SectorAnalyst {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  calls: number;
  following: boolean;
}

export interface SectorPayload {
  sector: string;
  namesCovered: number;
  analystsActive: number;
  publicationsThisWeek: number;
  names: SectorName[];
  /** Equal-weight average of the listed names' day changes; null until quotes carry it. */
  dayChangeEqualWeight: number | null;
  openCalls: number;
  resolvedCount: number;
  publications: TodayItem[];
  analysts: SectorAnalyst[];
}

export function isKnownSector(name: string): boolean {
  return MARKET_SECTORS.some((s) => s.toLowerCase() === name.toLowerCase());
}

export function canonicalSector(name: string): string | null {
  return MARKET_SECTORS.find((s) => s.toLowerCase() === name.toLowerCase()) ?? null;
}

const REPORT_SELECT = "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalizeReport(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  return { ...(row as unknown as Report), prediction: (raw ?? null) as Prediction | null };
}

/**
 * Honest badge (only what is stored) and the anchoring rule: only a locked
 * call earns a ticker and direction; callless items anchor on the sector.
 */
function toItem(report: Report, sector: string): TodayItem | null {
  if (!report.author) return null;
  const hasCall = Boolean(report.prediction);
  const badge: string[] = [];
  if (hasCall) badge.push("Call");
  if (report.type === "research" || (report.body?.length ?? 0) > 600) badge.push("Thesis");
  if (badge.length === 0) badge.push("Note");
  const themeTag = hasCall ? null : sector.toUpperCase();

  return {
    reportId: report.id,
    type: report.type,
    ticker: hasCall ? (report.prediction?.ticker ?? null) : null,
    direction: hasCall ? (report.prediction?.direction ?? null) : null,
    contentBadge: badge,
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: {
      handle: report.author.handle,
      displayName: report.author.display_name,
      avatarUrl: report.author.avatar_url,
    },
    publishedAt: report.published_at ?? report.created_at,
    access: report.access,
    price: report.price,
    saved: false,
    thumb: null,
    themeTag,
  };
}

/** Symbols the instrument table places in this sector, plus the static universe. */
async function sectorSymbols(sector: string): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("tickers")
    .select("symbol")
    .eq("status", "active")
    .eq("sector", sector)
    .limit(500);

  const symbols = new Set(
    ((data as { symbol: string }[]) ?? []).map((r) => r.symbol.toUpperCase()),
  );
  for (const u of UNIVERSE) {
    if (u.sector === sector) symbols.add(u.ticker);
  }
  return [...symbols];
}

export async function buildSector(sector: string, viewerId: string | null): Promise<SectorPayload> {
  const payload = await cachedPage(`sector:${sector.toLowerCase()}`, 20, () => assembleSector(sector));
  if (!viewerId) return payload;
  const followed = new Set(await followedAnalystIds(viewerId));
  return {
    ...payload,
    analysts: payload.analysts.map((a) => ({ ...a, following: followed.has(a.id) })),
  };
}

async function assembleSector(sector: string): Promise<SectorPayload> {
  const supabase = createPublicClient();
  const since = new Date(Date.now() - WEEK_MS);
  const symbols = await sectorSymbols(sector);

  const [{ data: reportRows }, { data: predictionRows }] = await Promise.all([
    symbols.length
      ? supabase
          .from("reports")
          .select(REPORT_SELECT)
          .in("status", ["published", "resolution_pending_review"])
          .in("ticker", symbols)
          .order("published_at", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [] }),
    symbols.length
      ? supabase
          .from("predictions")
          .select("*, author:profiles!predictions_author_id_fkey(*)")
          .in("ticker", symbols)
          .limit(600)
      : Promise.resolve({ data: [] }),
  ]);

  const followedIds = new Set<string>();
  const reports = ((reportRows as Record<string, unknown>[]) ?? []).map(normalizeReport);
  const predictions = (predictionRows as (Prediction & { author?: Profile | null })[]) ?? [];

  const coverage = new Map<string, number>();
  let publicationsThisWeek = 0;
  for (const r of reports) {
    const sym = r.ticker?.toUpperCase();
    if (sym) coverage.set(sym, (coverage.get(sym) ?? 0) + 1);
    if ((r.published_at ?? r.created_at) >= since.toISOString()) publicationsThisWeek += 1;
  }

  const openBySymbol = new Map<string, number>();
  const analystIds = new Set<string>();
  const perAnalyst = new Map<string, { profile: Profile; calls: number }>();
  let openCalls = 0;
  let resolvedCount = 0;

  for (const p of predictions) {
    const sym = p.ticker?.toUpperCase();
    if (!sym) continue;
    analystIds.add(p.author_id);

    if (p.author) {
      const entry = perAnalyst.get(p.author_id) ?? { profile: p.author, calls: 0 };
      entry.calls += 1;
      perAnalyst.set(p.author_id, entry);
    }

    if (p.outcome === "open") {
      openCalls += 1;
      openBySymbol.set(sym, (openBySymbol.get(sym) ?? 0) + 1);
    } else {
      resolvedCount += 1;
    }
  }

  // The eight most-covered names, falling back to the largest in the sector so
  // a quiet sector still shows what it contains.
  const ranked = [...coverage.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const shortlist = [...new Set([...ranked, ...symbols])].slice(0, 8);
  const [tickerRows, quotes] = await Promise.all([
    listTickerRows(shortlist),
    getQuotesBatch(shortlist, { fetchBenchmark: false }).catch(() => new Map()),
  ]);
  const bySymbol = new Map(tickerRows.map((r) => [r.symbol, r]));

  const names: SectorName[] = shortlist.flatMap((symbol) => {
    const row = bySymbol.get(symbol);
    const fallback = UNIVERSE.find((u) => u.ticker === symbol);
    const name = row?.name ?? fallback?.name;
    if (!name) return [];
    return [
      {
        symbol,
        company: name,
        price: quotes.get(symbol)?.price ?? row?.last_price ?? null,
        changePercent: quotes.get(symbol)?.changePercent ?? null,
        marketCap: row?.market_cap ?? null,
        publications: coverage.get(symbol) ?? 0,
        openCalls: openBySymbol.get(symbol) ?? 0,
      },
    ];
  });

  // Ordered by how much they publish here, not by Track Score. Ranking the
  // analysts against each other is the thing this surface no longer does.
  const analysts: SectorAnalyst[] = [...perAnalyst.values()]
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 4)
    .map((a) => ({
      id: a.profile.id,
      handle: a.profile.handle,
      displayName: a.profile.display_name,
      avatarUrl: a.profile.avatar_url,
      calls: a.calls,
      following: followedIds.has(a.profile.id),
    }));

  // Commentary carrying no ticker is tagged to the sector so macro and theme
  // writing has a home; it reaches no other surface in the product.
  const publications = reports
    .flatMap((r) => {
      const item = toItem(r, sector);
      return item ? [item] : [];
    })
    .slice(0, 5);

  const changes = names.map((n) => n.changePercent).filter((c): c is number => c != null);
  const dayChangeEqualWeight = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null;

  return {
    sector,
    dayChangeEqualWeight,
    namesCovered: coverage.size,
    analystsActive: analystIds.size,
    publicationsThisWeek,
    names,
    openCalls,
    resolvedCount,
    publications,
    analysts,
  };
}
