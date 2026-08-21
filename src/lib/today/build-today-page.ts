import "server-only";

import { getProfilesByIds, listAnalystsByFollowers } from "@/lib/db/profiles";
import { listPublishedByAuthors, listRecentPublished, tickerCoverage } from "@/lib/db/reports";
import { listTickerRows } from "@/lib/db/tickers";
import { listRecentResolvedWithReports } from "@/lib/db/predictions";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { createClient } from "@/lib/supabase/server";
import { getQuotesBatch } from "@/lib/engine/market";
import { MARKET_THEMES } from "@/lib/markets/themes";
import { themeLabel } from "@/lib/tags/taxonomy";
import { reportIdsWithCards } from "@/lib/db/publication-cards";
import { getCycleWindow } from "@/lib/dispatch/cycle";
import { getIssueNumber } from "@/lib/dispatch/issue-number";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { cachedPage } from "@/lib/cache/page";
import {
  medianRate,
  publicationAttention,
  stageFor,
  trendingScore,
  visibleStageMarker,
  type AttentionSample,
} from "@/lib/lifecycle/stages";
import type { Profile, Report } from "@/lib/types";
import type { VideoClipCard } from "@/lib/db/video-clips";
import type {
  StageMarker,
  TodayAnalyst,
  TodayCreatorRow,
  TodayDeskItem,
  TodayItem,
  TodayPagePayload,
  TodaySidebarPayload,
  TodayThemeCluster,
  TodayTickerRow,
  TodayVerdict,
} from "@/lib/today/types";

const DAY = 86_400_000;

function toAnalyst(profile: Profile): TodayAnalyst {
  return { handle: profile.handle, displayName: profile.display_name, avatarUrl: profile.avatar_url };
}

/**
 * The content badge states exactly what is stored: a ready clip, a locked
 * call, a written thesis, an evidence stack. Nothing is claimed that a reader
 * cannot then find.
 */
export function honestBadge(report: Report, hasVideo: boolean, hasCards = false): string[] {
  const badge: string[] = [];
  if (hasVideo) badge.push("Video");
  if (report.prediction) badge.push("Call");
  if (report.type === "research" || (report.body?.length ?? 0) > 600) badge.push("Thesis");
  if (hasCards) badge.push("Cards");
  if (badge.length === 0) badge.push("Note");
  return badge;
}

const fetchIssueNumber = getIssueNumber;

interface Ctx {
  clipsByReport: Map<string, VideoClipCard>;
  sectorByTicker: Map<string, string | null>;
  savedIds: Set<string>;
  cardIds: Set<string>;
  markerByReport: Map<string, StageMarker>;
  markerByAuthor: Map<string, StageMarker>;
}

function toItem(report: Report, ctx: Ctx): TodayItem | null {
  if (!report.author) return null;
  const clip = ctx.clipsByReport.get(report.id) ?? null;
  const hasCall = Boolean(report.prediction);
  const pubMarker = ctx.markerByReport.get(report.id) ?? null;
  const authorMarker = ctx.markerByAuthor.get(report.author_id) ?? null;
  return {
    reportId: report.id,
    type: report.type,
    // Anchoring rule: only a locked call earns a ticker and direction chip.
    ticker: hasCall ? (report.prediction?.ticker ?? null) : null,
    direction: hasCall ? (report.prediction?.direction ?? null) : null,
    contentBadge: honestBadge(report, Boolean(clip), ctx.cardIds.has(report.id)),
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: toAnalyst(report.author),
    publishedAt: report.published_at ?? report.created_at,
    access: report.access,
    price: report.price,
    saved: ctx.savedIds.has(report.id),
    thumb: clip ? { thumbnailUrl: clip.thumbnail_url, durationSeconds: clip.duration_seconds } : null,
    // Callless items anchor on the publication's stored theme tag.
    themeTag: hasCall ? null : themeLabel(report),
    sector: (() => {
      const sym = (report.prediction?.ticker ?? report.ticker)?.toUpperCase();
      return sym ? ctx.sectorByTicker.get(sym) ?? null : null;
    })(),
    stageMarker: pubMarker === "TRENDING" || authorMarker === "TRENDING" ? "TRENDING" : (pubMarker ?? authorMarker),
  };
}

function sampleFor(report: Report): AttentionSample {
  return {
    since: report.published_at ?? report.created_at,
    total: publicationAttention({ views: report.views ?? 0, likes: report.likes ?? 0, comments: report.comment_count ?? 0 }),
  };
}

function creatorSample(profile: Profile, publications: number): AttentionSample {
  return { since: profile.created_at, total: profile.followers_count ?? 0, publications };
}

async function fetchSavedIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_reports").select("report_id").eq("user_id", userId);
  return new Set(((data as { report_id: string }[]) ?? []).map((r) => r.report_id));
}

function creatorRow(p: Profile, marker: StageMarker, suggestion = false): TodayCreatorRow {
  return { id: p.id, handle: p.handle, displayName: p.display_name, avatarUrl: p.avatar_url, marker, suggestion };
}

/**
 * Builds the whole Today front page. Signed-out readers get the platform-wide
 * issue (no desk, no memberships); Verdicts renders for everyone.
 */
export async function buildTodayPage(userId: string | null): Promise<TodayPagePayload> {
  if (!userId) return cachedPage("today-public", 20, () => assembleTodayPage(null));
  return assembleTodayPage(userId);
}

async function assembleTodayPage(userId: string | null): Promise<TodayPagePayload> {
  const now = Date.now();
  const cycle = getCycleWindow();
  const dateISO = cycle.dateIso;

  const emptySaved = new Set<string>();
  const [pool, clips, analysts, resolved, coverage, issueNumber, subscribedIds, followedIds, savedIds] =
    await Promise.all([
      listRecentPublished(120),
      listVideoClipCards(120),
      listAnalystsByFollowers(40),
      listRecentResolvedWithReports(24),
      tickerCoverage(),
      fetchIssueNumber(dateISO),
      userId ? subscribedAnalystIds(userId) : Promise.resolve([] as string[]),
      userId ? followedAnalystIds(userId) : Promise.resolve([] as string[]),
      userId ? fetchSavedIds(userId) : Promise.resolve(emptySaved),
    ]);

  const deskAuthorIds = [...new Set([...subscribedIds, ...followedIds])];
  const poolSymbols = [
    ...new Set(pool.map((r) => (r.prediction?.ticker ?? r.ticker)?.toUpperCase()).filter((s): s is string => Boolean(s))),
  ];
  const popularSyms = Object.entries(coverage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s]) => s.toUpperCase());

  const [deskReports, deskProfiles, poolTickerRows, popularQuotes, cardIds] = await Promise.all([
    listPublishedByAuthors(deskAuthorIds, 30),
    getProfilesByIds(deskAuthorIds),
    poolSymbols.length ? listTickerRows(poolSymbols) : Promise.resolve([]),
    getQuotesBatch(popularSyms, { fetchBenchmark: false }).catch(() => new Map()),
    reportIdsWithCards(pool.map((r) => r.id), { sessionless: userId === null }),
  ]);

  const clipsByReport = new Map<string, VideoClipCard>();
  for (const c of clips) if (!clipsByReport.has(c.report_id)) clipsByReport.set(c.report_id, c);

  const deskSymbols = [
    ...new Set(
      deskReports
        .map((r) => (r.prediction?.ticker ?? r.ticker)?.toUpperCase())
        .filter((s): s is string => typeof s === "string" && s.length > 0 && !poolSymbols.includes(s)),
    ),
  ];
  const extraTickerRows = deskSymbols.length ? await listTickerRows(deskSymbols) : [];

  const sectorByTicker = new Map<string, string | null>();
  for (const row of [...poolTickerRows, ...extraTickerRows]) sectorByTicker.set(row.symbol.toUpperCase(), row.sector);

  // Lifecycle stages for publications and creators, from the same pool.
  const pubSamples = new Map(pool.map((r) => [r.id, sampleFor(r)]));
  const pubMedian = medianRate([...pubSamples.values()], now);
  const markerByReport = new Map<string, StageMarker>();
  for (const [id, s] of pubSamples) markerByReport.set(id, visibleStageMarker(stageFor(s, "publication", pubMedian, now)));

  const pubCountByAuthor = new Map<string, number>();
  for (const r of pool) pubCountByAuthor.set(r.author_id, (pubCountByAuthor.get(r.author_id) ?? 0) + 1);
  const authorPool = new Map<string, Profile>();
  for (const p of analysts) authorPool.set(p.id, p);
  for (const r of pool) if (r.author && !authorPool.has(r.author.id)) authorPool.set(r.author.id, r.author);
  for (const p of deskProfiles) authorPool.set(p.id, p);
  const creatorSamples = new Map([...authorPool.values()].map((p) => [p.id, creatorSample(p, pubCountByAuthor.get(p.id) ?? 0)]));
  const creatorMedian = medianRate([...creatorSamples.values()], now);
  const markerByAuthor = new Map<string, StageMarker>();
  for (const [id, s] of creatorSamples) markerByAuthor.set(id, visibleStageMarker(stageFor(s, "creator", creatorMedian, now)));

  const ctx: Ctx = { clipsByReport, sectorByTicker, savedIds, cardIds, markerByReport, markerByAuthor };
  const items = new Map<string, TodayItem>();
  for (const r of pool) {
    const it = toItem(r, ctx);
    if (it) items.set(r.id, it);
  }

  // Ranking by velocity, then recency. The lead is the strongest item with a video.
  const ranked = [...pool]
    .map((r) => ({ r, score: trendingScore(pubSamples.get(r.id)!, now) }))
    .sort((a, b) => b.score - a.score || Date.parse(b.r.published_at ?? b.r.created_at) - Date.parse(a.r.published_at ?? a.r.created_at))
    .map((x) => x.r);
  const leadReport = ranked.find((r) => clipsByReport.has(r.id) && items.has(r.id)) ?? ranked.find((r) => items.has(r.id)) ?? null;
  const lead = leadReport ? items.get(leadReport.id) ?? null : null;
  const used = new Set<string>(lead ? [lead.reportId] : []);
  const secondary: TodayItem[] = [];
  for (const r of ranked) {
    if (secondary.length >= 3) break;
    if (used.has(r.id) || !items.has(r.id)) continue;
    secondary.push(items.get(r.id)!);
    used.add(r.id);
  }
  const trending: TodayItem[] = [];
  for (const r of ranked) {
    if (trending.length >= 16) break;
    if (used.has(r.id) || !items.has(r.id)) continue;
    if (trendingScore(pubSamples.get(r.id)!, now) <= 0) break;
    trending.push(items.get(r.id)!);
  }

  // Your Desk: memberships and follows merged into one rail, newest first.
  const memberSet = new Set(subscribedIds);
  const desk: TodayDeskItem[] = deskReports
    .flatMap((r) => {
      const it = toItem(r, ctx);
      return it ? [{ ...it, relationship: memberSet.has(r.author_id) ? "member" : "following" } as TodayDeskItem] : [];
    })
    .slice(0, 12);

  // Verdicts: discovery first (analysts the reader does not already know).
  const deskSet = new Set(deskAuthorIds);
  const verdictsAll: TodayVerdict[] = resolved.map((p) => ({
    reportId: p.report!.id,
    ticker: p.ticker.toUpperCase(),
    direction: p.direction,
    outcome: p.outcome as TodayVerdict["outcome"],
    headline: p.report!.title?.trim() || p.report!.summary?.trim() || `${p.ticker.toUpperCase()} call`,
    entryPrice: p.lock_price,
    exitPrice: p.resolved_price,
    returnPct: p.return_pct,
    resolvedAt: p.resolution_trading_date ?? p.resolves_at,
    author: toAnalyst(p.author!),
  }));
  const verdicts = [
    ...verdictsAll.filter((v, i) => !deskSet.has(resolved[i].author_id)),
    ...verdictsAll.filter((v, i) => deskSet.has(resolved[i].author_id)),
  ].slice(0, 12);

  // Theme cluster: the editorial theme with the most publications this week.
  const weekAgo = now - 7 * DAY;
  let theme: TodayThemeCluster | null = null;
  for (const t of MARKET_THEMES) {
    const set = new Set(t.tickers.map((x) => x.toUpperCase()));
    const inTheme = pool.filter((r) => {
      const sym = (r.prediction?.ticker ?? r.ticker)?.toUpperCase();
      return sym && set.has(sym);
    });
    const thisWeek = inTheme.filter((r) => Date.parse(r.published_at ?? r.created_at) >= weekAgo).length;
    if (thisWeek >= 2 && (!theme || thisWeek > theme.publicationsThisWeek)) {
      theme = {
        slug: t.slug,
        name: t.name,
        publicationsThisWeek: thisWeek,
        items: inTheme.flatMap((r) => (items.has(r.id) ? [items.get(r.id)!] : [])).slice(0, 8),
      };
    }
  }

  // Sidebar lists.
  const authorTrend = new Map<string, number>();
  for (const r of pool) {
    const s = trendingScore(pubSamples.get(r.id)!, now);
    if (s > 0) authorTrend.set(r.author_id, (authorTrend.get(r.author_id) ?? 0) + s);
  }
  const trendingCreators = [...authorTrend.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => authorPool.get(id))
    .filter((p): p is Profile => Boolean(p))
    .slice(0, 8)
    .map((p) => creatorRow(p, markerByAuthor.get(p.id) ?? null));
  const popularCreators = analysts.slice(0, 8).map((p) => creatorRow(p, markerByAuthor.get(p.id) ?? null));

  const tickerTrend = new Map<string, number>();
  const tickerPubs = new Map<string, number>();
  for (const r of pool) {
    const sym = (r.prediction?.ticker ?? r.ticker)?.toUpperCase();
    if (!sym) continue;
    tickerPubs.set(sym, (tickerPubs.get(sym) ?? 0) + 1);
    const s = trendingScore(pubSamples.get(r.id)!, now);
    if (s > 0) tickerTrend.set(sym, (tickerTrend.get(sym) ?? 0) + s);
  }
  const trendingSyms = [...tickerTrend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);
  const extraQuoteSyms = trendingSyms.filter((s) => !popularQuotes.has(s));
  const extraQuotes = extraQuoteSyms.length
    ? await getQuotesBatch(extraQuoteSyms, { fetchBenchmark: false }).catch(() => new Map())
    : new Map();
  const quotes = extraQuotes.size ? new Map([...popularQuotes, ...extraQuotes]) : popularQuotes;
  const tickerRow = (symbol: string, suggestion = false): TodayTickerRow => ({
    symbol,
    price: quotes.get(symbol)?.price ?? null,
    changePercent: quotes.get(symbol)?.changePercent ?? null,
    publications: coverage[symbol] ?? tickerPubs.get(symbol) ?? 0,
    suggestion,
  });

  const known = new Set(deskAuthorIds);
  const sidebar: TodaySidebarPayload = {
    trendingCreators,
    popularCreators,
    trendingTickers: trendingSyms.map((s) => tickerRow(s)),
    popularTickers: popularSyms.map((s) => tickerRow(s)),
    memberships: deskProfiles.filter((p) => memberSet.has(p.id)).map((p) => creatorRow(p, markerByAuthor.get(p.id) ?? null)),
    following: deskProfiles.filter((p) => !memberSet.has(p.id)).map((p) => creatorRow(p, markerByAuthor.get(p.id) ?? null)),
    suggestedCreators: analysts.filter((p) => !known.has(p.id) && p.id !== userId).slice(0, 6).map((p) => creatorRow(p, markerByAuthor.get(p.id) ?? null, true)),
    suggestedTickers: popularSyms.slice(0, 6).map((s) => tickerRow(s, true)),
    signedIn: Boolean(userId),
  };

  return {
    issue: { issueNumber, dateISO },
    personalized: Boolean(userId),
    lead,
    secondary,
    trending,
    desk,
    verdicts,
    theme,
    news: [],
    sidebar,
  };
}
