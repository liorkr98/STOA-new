import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { listTickerRows } from "@/lib/db/tickers";
import { followedAnalystIds } from "@/lib/db/social";
import { getQuotesBatch } from "@/lib/engine/market";
import { UNIVERSE } from "@/lib/universe";
import { MARKET_THEMES, type MarketTheme } from "@/lib/markets/themes";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { cachedPage } from "@/lib/cache/page";
import type { MarketRow } from "@/lib/markets/types";
import type { TodayItem } from "@/lib/today/types";
import type { Prediction, Profile, Report } from "@/lib/types";

const WEEK_MS = 7 * 86_400_000;

export interface ThemeName extends MarketRow {
  publications: number;
}

export interface ThemeAnalyst {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  publications: number;
  following: boolean;
}

export interface ThemePayload {
  theme: MarketTheme;
  namesCovered: number;
  analystsActive: number;
  publicationsThisWeek: number;
  publicationsLastWeek: number;
  names: ThemeName[];
  publications: TodayItem[];
  analysts: ThemeAnalyst[];
}

export function findTheme(slug: string): MarketTheme | null {
  return MARKET_THEMES.find((t) => t.slug === slug) ?? null;
}

const REPORT_SELECT = "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalizeReport(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  return { ...(row as unknown as Report), prediction: (raw ?? null) as Prediction | null };
}

/** Honest badge and anchoring: only a call earns a ticker; callless items carry the theme tag. */
function toItem(report: Report, themeName: string): TodayItem | null {
  if (!report.author) return null;
  const hasCall = Boolean(report.prediction);
  const badge: string[] = [];
  if (hasCall) badge.push("Call");
  if (report.type === "research" || (report.body?.length ?? 0) > 600) badge.push("Thesis");
  if (badge.length === 0) badge.push("Note");
  return {
    reportId: report.id,
    type: report.type,
    ticker: hasCall ? (report.prediction?.ticker ?? null) : null,
    direction: hasCall ? (report.prediction?.direction ?? null) : null,
    contentBadge: badge,
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: { id: report.author.id, handle: report.author.handle, displayName: report.author.display_name, avatarUrl: report.author.avatar_url },
    publishedAt: report.published_at ?? report.created_at,
    access: report.access,
    price: report.price,
    saved: false,
    thumb: null,
    themeTag: hasCall ? null : themeName.toUpperCase(),
  };
}

/**
 * The theme page: constituents with prices, publications about the theme
 * (calls on its names and callless commentary on them), the analysts most
 * active in it, and coverage counts with momentum. Counts only, never a
 * blended stance.
 */
export async function buildTheme(theme: MarketTheme, viewerId: string | null): Promise<ThemePayload> {
  const payload = await cachedPage(`theme:${theme.slug}`, 20, () => assembleTheme(theme));
  if (!viewerId) return payload;
  const followed = new Set(await followedAnalystIds(viewerId));
  return {
    ...payload,
    analysts: payload.analysts.map((a) => ({ ...a, following: followed.has(a.id) })),
  };
}

async function assembleTheme(theme: MarketTheme): Promise<ThemePayload> {
  const supabase = createPublicClient();
  const symbols = theme.tickers.map((s) => s.toUpperCase());
  const now = Date.now();
  const weekAgo = new Date(now - WEEK_MS).toISOString();
  const twoWeeksAgo = new Date(now - 2 * WEEK_MS).toISOString();

  const [reportRes, tickerRows, quotes] = await Promise.all([
    supabase
      .from("reports")
      .select(REPORT_SELECT)
      .in("status", ["published", "resolution_pending_review"])
      .in("ticker", symbols)
      .order("published_at", { ascending: false })
      .limit(120),
    listTickerRows(symbols),
    getQuotesBatch(symbols, { fetchBenchmark: false }).catch(() => new Map()),
  ]);
  const followedIds = new Set<string>();
  const reportRows = reportRes.data;

  const reports = ((reportRows as Record<string, unknown>[]) ?? []).map(normalizeReport);
  const coverage = new Map<string, number>();
  const perAnalyst = new Map<string, { profile: Profile; publications: number }>();
  let thisWeek = 0;
  let lastWeek = 0;
  for (const r of reports) {
    const sym = (r.prediction?.ticker ?? r.ticker)?.toUpperCase();
    if (sym) coverage.set(sym, (coverage.get(sym) ?? 0) + 1);
    const when = r.published_at ?? r.created_at;
    if (when >= weekAgo) thisWeek += 1;
    else if (when >= twoWeeksAgo) lastWeek += 1;
    if (r.author) {
      const e = perAnalyst.get(r.author_id) ?? { profile: r.author, publications: 0 };
      e.publications += 1;
      perAnalyst.set(r.author_id, e);
    }
  }

  const bySymbol = new Map(tickerRows.map((t) => [t.symbol.toUpperCase(), t]));
  const names: ThemeName[] = symbols.flatMap((symbol) => {
    const row = bySymbol.get(symbol);
    const fallback = UNIVERSE.find((u) => u.ticker === symbol);
    const name = row?.name ?? fallback?.name;
    if (!name) return [];
    const q = quotes.get(symbol);
    return [
      {
        symbol,
        company: name,
        price: q?.price ?? row?.last_price ?? null,
        changePercent: q?.changePercent ?? null,
        marketCap: row?.market_cap ?? null,
        publications: coverage.get(symbol) ?? 0,
      },
    ];
  });

  // Ordered by how much they publish in the theme. No ranking numbers, no scores.
  const analysts: ThemeAnalyst[] = [...perAnalyst.values()]
    .sort((a, b) => b.publications - a.publications)
    .slice(0, 4)
    .map((a) => ({
      id: a.profile.id,
      handle: a.profile.handle,
      displayName: a.profile.display_name,
      avatarUrl: a.profile.avatar_url,
      publications: a.publications,
      following: followedIds.has(a.profile.id),
    }));

  const publications = reports.flatMap((r) => {
    const it = toItem(r, theme.name);
    return it ? [it] : [];
  }).slice(0, 8);

  return {
    theme,
    namesCovered: coverage.size,
    analystsActive: perAnalyst.size,
    publicationsThisWeek: thisWeek,
    publicationsLastWeek: lastWeek,
    names,
    publications,
    analysts,
  };
}
