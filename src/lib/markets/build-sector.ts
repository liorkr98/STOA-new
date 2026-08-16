import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listTickerRows } from "@/lib/db/tickers";
import { followedAnalystIds } from "@/lib/db/social";
import { UNIVERSE } from "@/lib/universe";
import { MARKET_SECTORS } from "@/lib/markets/themes";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import type { CallLean, MarketRow } from "@/lib/markets/types";
import type { TodayItem } from "@/lib/today/types";
import type { Prediction, Profile, Report } from "@/lib/types";

const WEEK_MS = 7 * 86_400_000;

export interface SectorName extends MarketRow {
  publications: number;
  lean: CallLean;
}

export interface SectorAnalyst {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  score: number | null;
  provisional: boolean;
  calls: number;
  hitRatePct: number | null;
  following: boolean;
}

export interface SectorPayload {
  sector: string;
  namesCovered: number;
  analystsActive: number;
  publicationsThisWeek: number;
  names: SectorName[];
  openCalls: number;
  long: number;
  short: number;
  averageScore: number | null;
  hitRatePct: number | null;
  resolvedCount: number;
  publications: TodayItem[];
  topAnalysts: SectorAnalyst[];
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

function toItem(report: Report, themeTag: string | null): TodayItem | null {
  if (!report.author) return null;
  const badge = ["Video"];
  if (report.prediction || report.type === "call") badge.push("Call");
  badge.push("Cards");
  if (report.body) badge.push("Thesis");

  return {
    reportId: report.id,
    type: report.type,
    ticker: report.ticker ?? report.prediction?.ticker ?? null,
    direction: report.prediction?.direction ?? null,
    contentBadge: badge,
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: {
      handle: report.author.handle,
      displayName: report.author.display_name,
      avatarUrl: report.author.avatar_url,
      score: report.author.score || null,
      provisional: (report.author.sample_size ?? 0) < 10,
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  const followedIds = new Set(viewerId ? await followedAnalystIds(viewerId) : []);
  const symbols = await sectorSymbols(sector);
  const since = new Date(Date.now() - WEEK_MS);

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

  const reports = ((reportRows as Record<string, unknown>[]) ?? []).map(normalizeReport);
  const predictions = (predictionRows as (Prediction & { author?: Profile | null })[]) ?? [];

  const coverage = new Map<string, number>();
  let publicationsThisWeek = 0;
  for (const r of reports) {
    const sym = r.ticker?.toUpperCase();
    if (sym) coverage.set(sym, (coverage.get(sym) ?? 0) + 1);
    if ((r.published_at ?? r.created_at) >= since.toISOString()) publicationsThisWeek += 1;
  }

  const leanBySymbol = new Map<string, CallLean>();
  const analystIds = new Set<string>();
  const perAnalyst = new Map<
    string,
    { profile: Profile; calls: number; resolved: number; hits: number }
  >();
  let openCalls = 0;
  let long = 0;
  let short = 0;
  let resolvedCount = 0;
  let hits = 0;

  for (const p of predictions) {
    const sym = p.ticker?.toUpperCase();
    if (!sym) continue;
    analystIds.add(p.author_id);

    if (p.author) {
      const entry = perAnalyst.get(p.author_id) ?? {
        profile: p.author,
        calls: 0,
        resolved: 0,
        hits: 0,
      };
      entry.calls += 1;
      if (p.outcome !== "open") {
        entry.resolved += 1;
        if (p.outcome === "hit") entry.hits += 1;
      }
      perAnalyst.set(p.author_id, entry);
    }

    const lean = leanBySymbol.get(sym) ?? { long: 0, short: 0 };
    if (p.outcome === "open") {
      openCalls += 1;
      if (p.direction === "long") {
        long += 1;
        lean.long += 1;
      }
      if (p.direction === "short") {
        short += 1;
        lean.short += 1;
      }
    } else {
      resolvedCount += 1;
      if (p.outcome === "hit") hits += 1;
    }
    leanBySymbol.set(sym, lean);
  }

  // The eight most-covered names, falling back to the largest in the sector so
  // a quiet sector still shows what it contains.
  const ranked = [...coverage.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const shortlist = [...new Set([...ranked, ...symbols])].slice(0, 8);
  const tickerRows = await listTickerRows(shortlist);
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
        price: row?.last_price ?? null,
        // DAY-CHANGE-PENDING: list surface, no previous close available.
        changePercent: null,
        marketCap: row?.market_cap ?? null,
        publications: coverage.get(symbol) ?? 0,
        lean: leanBySymbol.get(symbol) ?? { long: 0, short: 0 },
      },
    ];
  });

  const scores = [...perAnalyst.values()]
    .map((a) => a.profile.score)
    .filter((s): s is number => typeof s === "number" && s > 0);

  const topAnalysts: SectorAnalyst[] = [...perAnalyst.values()]
    .sort((a, b) => (b.profile.score ?? 0) - (a.profile.score ?? 0))
    .slice(0, 4)
    .map((a) => ({
      id: a.profile.id,
      handle: a.profile.handle,
      displayName: a.profile.display_name,
      avatarUrl: a.profile.avatar_url,
      score: a.profile.score || null,
      provisional: (a.profile.sample_size ?? 0) < 10,
      calls: a.calls,
      hitRatePct: a.resolved > 0 ? Math.round((a.hits / a.resolved) * 100) : null,
      following: followedIds.has(a.profile.id),
    }));

  // Commentary carrying no ticker is tagged to the sector so macro and theme
  // writing has a home; it reaches no other surface in the product.
  const publications = reports
    .flatMap((r) => {
      const item = toItem(r, r.ticker ? null : sector);
      return item ? [item] : [];
    })
    .slice(0, 5);

  return {
    sector,
    namesCovered: coverage.size,
    analystsActive: analystIds.size,
    publicationsThisWeek,
    names,
    openCalls,
    long,
    short,
    averageScore: scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null,
    hitRatePct: resolvedCount > 0 ? Math.round((hits / resolvedCount) * 100) : null,
    resolvedCount,
    publications,
    topAnalysts,
  };
}
