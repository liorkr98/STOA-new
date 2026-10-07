import "server-only";

import { getProfilesByIds, listAnalystsByFollowers } from "@/lib/db/profiles";
import {
  countPublishedBetween,
  getReportsByIds,
  listPublishedByAuthors,
  listPublishedByTickers,
  listRecentPublished,
  tickerCoverage,
} from "@/lib/db/reports";
import { engagedReportIds } from "@/lib/db/history";
import { emptyViewerContext, loadViewerContext } from "@/lib/ranking/context";
import { listTickerRows } from "@/lib/db/tickers";
import { listPendingClipsForReports, listVideoClipCards } from "@/lib/db/video-clips";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { getQuotesBatch } from "@/lib/engine/market";
import { themeLabel } from "@/lib/tags/taxonomy";
import { reportIdsWithCards } from "@/lib/db/publication-cards";
import { getCycleWindow } from "@/lib/dispatch/cycle";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { cachedPage } from "@/lib/cache/page";
import { preferVideo } from "@/lib/today/video-preference";
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
  TodayFace,
  TodayItem,
  TodayPagePayload,
  TodaySidebarPayload,
  TodayTickerRow,
} from "@/lib/today/types";
import { stanceChips } from "@/lib/db/publication-row";


function toAnalyst(profile: Profile): TodayAnalyst {
  return {
    id: profile.id,
    handle: profile.handle,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    specialty: profile.profile_config?.specialty?.trim() || null,
  };
}

/**
 * The content badge states exactly what is stored: a ready clip, a written
 * thesis, an evidence stack. Nothing is claimed that a reader
 * cannot then find.
 */
export function honestBadge(report: Report, hasVideo: boolean, hasCards = false): string[] {
  const badge: string[] = [];
  if (hasVideo) badge.push("Video");
  if (report.type === "research" || (report.body?.length ?? 0) > 600) badge.push("Thesis");
  if (hasCards) badge.push("Cards");
  if (badge.length === 0) badge.push("Note");
  return badge;
}

interface Ctx {
  clipsByReport: Map<string, VideoClipCard>;
  /** Publications whose clip exists but is not live yet. */
  pendingClipIds: Set<string>;
  sectorByTicker: Map<string, string | null>;
  cardIds: Set<string>;
  markerByReport: Map<string, StageMarker>;
  markerByAuthor: Map<string, StageMarker>;
}

function toItem(report: Report, ctx: Ctx): TodayItem | null {
  if (!report.author) return null;
  const clip = ctx.clipsByReport.get(report.id) ?? null;
  const pending = !clip && ctx.pendingClipIds.has(report.id);
  const chips = stanceChips(report);
  const pubMarker = ctx.markerByReport.get(report.id) ?? null;
  const authorMarker = ctx.markerByAuthor.get(report.author_id) ?? null;
  return {
    reportId: report.id,
    type: report.type,
    // The publication's own stance: its ticker, and a direction when it declares one.
    ticker: chips.ticker,
    direction: chips.direction,
    contentBadge: honestBadge(report, Boolean(clip) || pending, ctx.cardIds.has(report.id)),
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: toAnalyst(report.author),
    publishedAt: report.published_at ?? report.created_at,
    access: report.access,
    price: report.price,
    saved: false,
    thumb: clip
      ? { thumbnailUrl: clip.thumbnail_url, durationSeconds: clip.duration_seconds }
      : pending
        ? { thumbnailUrl: null, durationSeconds: 0, processing: true }
        : null,
    // Tickerless items anchor on the publication's stored theme tag.
    themeTag: chips.ticker ? null : themeLabel(report),
    sector: (() => {
      const sym = report.ticker?.toUpperCase();
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

function creatorRow(p: Profile, marker: StageMarker, followed: boolean): TodayCreatorRow {
  return { id: p.id, handle: p.handle, displayName: p.display_name, avatarUrl: p.avatar_url, marker, followed };
}

/**
 * What Today fits a signed-in reader's shelves to. `follows` is what they
 * chose: analysts they follow or pay, their tickers, their sectors and
 * themes. `taste` is what they spent time on: the analysts, tickers, sectors
 * and themes of pieces they watched, liked, saved or bought. Used only to
 * pick and order; nothing about it is ever shown.
 */
interface Fit {
  analysts: ReadonlySet<string>;
  tickers: ReadonlySet<string>;
  sectors: ReadonlySet<string>;
  tasteAnalysts: ReadonlySet<string>;
  tasteTickers: ReadonlySet<string>;
  tasteSectors: ReadonlySet<string>;
  seen: ReadonlySet<string>;
}

const lower = (s: string | null | undefined) => (s ? s.toLowerCase() : null);

function followsMatch(it: TodayItem, fit: Fit): number {
  let n = 0;
  if (fit.analysts.has(it.author.id)) n += 3;
  if (it.ticker && fit.tickers.has(it.ticker.toUpperCase())) n += 2;
  const sector = lower(it.sector);
  const theme = lower(it.themeTag);
  if ((sector && fit.sectors.has(sector)) || (theme && fit.sectors.has(theme))) n += 1;
  return n;
}

function tasteMatch(it: TodayItem, fit: Fit): number {
  let n = 0;
  if (fit.tasteAnalysts.has(it.author.id)) n += 1;
  if (it.ticker && fit.tasteTickers.has(it.ticker.toUpperCase())) n += 1;
  const sector = lower(it.sector);
  const theme = lower(it.themeTag);
  if ((sector && fit.tasteSectors.has(sector)) || (theme && fit.tasteSectors.has(theme))) n += 1;
  return n;
}

/**
 * The items that fit, best fit first and newest within a tie. Pieces the
 * reader already spent time on are left out: the shelf is for what is next.
 */
function fitted(candidates: TodayItem[], fit: Fit): TodayItem[] {
  return candidates
    .filter((it) => !fit.seen.has(it.reportId))
    .map((it) => ({ it, n: followsMatch(it, fit) + tasteMatch(it, fit) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || Date.parse(b.it.publishedAt ?? "") - Date.parse(a.it.publishedAt ?? ""))
    .map((x) => x.it);
}

/**
 * Builds the whole Today front page. Signed-out readers get the platform-wide
 * issue: no faces, no desk, the general clips, and the rail's "Your" lists
 * asking them to sign in.
 */
export async function buildTodayPage(userId: string | null): Promise<TodayPagePayload> {
  if (!userId) return cachedPage("today-public:signed-out-viewing", 20, () => assembleTodayPage(null));
  return assembleTodayPage(userId);
}

async function assembleTodayPage(userId: string | null): Promise<TodayPagePayload> {
  const now = Date.now();
  const cycle = getCycleWindow();
  const dateISO = cycle.dateIso;

  const [pool, clips, analysts, coverage, publishedToday, subscribedIds, followedIds, viewer, historyIds] =
    await Promise.all([
      listRecentPublished(120),
      listVideoClipCards(120),
      listAnalystsByFollowers(40),
      tickerCoverage(),
      countPublishedBetween(cycle.start, cycle.end),
      userId ? subscribedAnalystIds(userId) : Promise.resolve([] as string[]),
      userId ? followedAnalystIds(userId) : Promise.resolve([] as string[]),
      userId ? loadViewerContext() : Promise.resolve(emptyViewerContext()),
      userId ? engagedReportIds(userId) : Promise.resolve([] as string[]),
    ]);

  const deskAuthorIds = [...new Set([...subscribedIds, ...followedIds])];
  const poolSymbols = [
    ...new Set(pool.map((r) => r.ticker?.toUpperCase()).filter((s): s is string => Boolean(s))),
  ];
  const popularSyms = Object.entries(coverage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s]) => s.toUpperCase());

  const [deskReports, tickerReports, historyReports, deskProfiles, poolTickerRows, popularQuotes, cardIds] = await Promise.all([
    listPublishedByAuthors(deskAuthorIds, 30),
    listPublishedByTickers([...viewer.watchlistTickers], 30),
    getReportsByIds(historyIds.slice(0, 80)),
    getProfilesByIds(deskAuthorIds),
    poolSymbols.length ? listTickerRows(poolSymbols) : Promise.resolve([]),
    getQuotesBatch(popularSyms, { fetchBenchmark: false }).catch(() => new Map()),
    reportIdsWithCards(pool.map((r) => r.id), { sessionless: userId === null }),
  ]);

  const clipsByReport = new Map<string, VideoClipCard>();
  for (const c of clips) if (!clipsByReport.has(c.report_id)) clipsByReport.set(c.report_id, c);

  const deskSymbols = [
    ...new Set(
      [...deskReports, ...tickerReports, ...historyReports]
        .map((r) => r.ticker?.toUpperCase())
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

  const pendingClipIds = new Set(
    (await listPendingClipsForReports(pool.map((r) => r.id).filter((id) => !clipsByReport.has(id)))).keys(),
  );
  const ctx: Ctx = { clipsByReport, pendingClipIds, sectorByTicker, cardIds, markerByReport, markerByAuthor };
  const items = new Map<string, TodayItem>();
  for (const r of pool) {
    const it = toItem(r, ctx);
    if (it) items.set(r.id, it);
  }

  // The reader's own candidates: their analysts' and tickers' newest work,
  // which the platform-wide pool may not reach. Signed out, there are none.
  const own = new Map<string, TodayItem>();
  for (const r of [...pool, ...deskReports, ...tickerReports]) {
    if (own.has(r.id)) continue;
    const it = items.get(r.id) ?? toItem(r, ctx);
    if (it) own.set(r.id, it);
  }
  const taste = historyReports.flatMap((r) => {
    const it = toItem(r, ctx);
    return it ? [it] : [];
  });
  const fit: Fit = {
    analysts: new Set(deskAuthorIds),
    tickers: viewer.watchlistTickers,
    sectors: viewer.sectorInterests,
    tasteAnalysts: new Set(taste.map((it) => it.author.id)),
    tasteTickers: new Set(taste.flatMap((it) => (it.ticker ? [it.ticker.toUpperCase()] : []))),
    tasteSectors: new Set(taste.flatMap((it) => [lower(it.sector), lower(it.themeTag)].filter((s): s is string => Boolean(s)))),
    seen: new Set(historyIds),
  };

  const hasClip = (reportId: string) => clipsByReport.has(reportId);

  // Ranking by velocity, then recency, with a lean towards publications that
  // carry a ready clip.
  //
  // The lean is `preferVideo`, and it only ever reorders: the velocity a
  // publication earned is still what it is ranked on, so a written report that
  // is genuinely the strongest still leads. An earlier version of this file was
  // deliberately blind to video because preferring it *hard* promoted the
  // second-best story whenever the best one happened to be written. A bounded
  // multiplier is the other thing: it settles the many near-ties in a day's
  // pool towards the form Stoa actually publishes in, and leaves a clear
  // winner alone.
  const ranked = [...pool]
    .map((r) => ({ r, score: preferVideo(trendingScore(pubSamples.get(r.id)!, now), hasClip(r.id)) }))
    .sort((a, b) => b.score - a.score || Date.parse(b.r.published_at ?? b.r.created_at) - Date.parse(a.r.published_at ?? a.r.created_at))
    .map((x) => x.r);
  const leadReport = ranked.find((r) => items.has(r.id)) ?? null;
  const lead = leadReport ? items.get(leadReport.id) ?? null : null;
  const used = new Set<string>(lead ? [lead.reportId] : []);

  const remaining = () =>
    ranked.filter((r) => !used.has(r.id) && items.has(r.id)).map((r) => items.get(r.id)!);
  const take = (list: TodayItem[]) => {
    for (const it of list) used.add(it.reportId);
    return list;
  };

  // Four clips worth a minute: ready clips only, so every tile is a real
  // poster. A clip still processing waits for tomorrow's page rather than
  // taking a tile with nothing to show. Signed in, the clips that fit the
  // reader come first and the general ones fill whatever is left.
  const ready = (it: TodayItem) => Boolean(it.thumb && !it.thumb.processing);
  const minuteOwn = userId
    ? fitted([...own.values()].filter((it) => ready(it) && !used.has(it.reportId)), fit).slice(0, 4)
    : [];
  const minuteOwnIds = new Set(minuteOwn.map((it) => it.reportId));
  const minute = take([
    ...minuteOwn,
    ...remaining().filter((it) => ready(it) && !minuteOwnIds.has(it.reportId)),
  ].slice(0, 4));

  // Your desk: the reader's shelf of written work, fitted the same way as the
  // clips above. Nothing fits, nothing drawn: Worth reading is the general shelf.
  const memberSet = new Set(subscribedIds);
  const desk: TodayDeskItem[] = userId
    ? take(
        fitted([...own.values()].filter((it) => it.type !== "video" && !used.has(it.reportId)), fit).slice(0, 6),
      ).map((it) => ({
        ...it,
        relationship: memberSet.has(it.author.id) ? "member" : deskAuthorIds.includes(it.author.id) ? "following" : undefined,
      }))
    : [];

  // The lead's theme: coverage on the same name, then the same sector, then
  // the same theme. Only real kin; the band is not padded with anything else.
  const cluster = (() => {
    if (!lead) return null;
    const label = lead.ticker ?? lead.sector ?? lead.themeTag ?? null;
    if (!label) return null;
    const kin = remaining().filter(
      (it) =>
        (lead.ticker != null && it.ticker === lead.ticker) ||
        (lead.sector != null && it.sector === lead.sector) ||
        (lead.themeTag != null && it.themeTag === lead.themeTag),
    );
    if (kin.length === 0) return null;
    return { label: lead.sector ?? lead.themeTag ?? label, items: take(kin.slice(0, 3)) };
  })();

  // Written pieces: the route onto Today for a thesis that is not the lead.
  // Pieces without a clip first, since the clips have their own band above.
  const rest = remaining();
  const reading = take([...rest.filter((it) => !it.thumb), ...rest.filter((it) => it.thumb)].slice(0, 4));

  // The faces: everyone who posted in the last 24 hours, newest first. On a
  // quiet day the most recent posters, so the row is never a promise of
  // "today" that the data cannot keep. Signed in, only the analysts the reader
  // follows or pays and whoever posted on their tickers and sectors, unless
  // none of them has posted; signed out, no faces at all.
  const windowStart = cycle.start.getTime();
  const ownFaces = [...deskReports, ...tickerReports, ...pool].filter((r) => {
    const it = own.get(r.id);
    return it ? followsMatch(it, fit) > 0 : false;
  });
  const facePool = !userId ? [] : ownFaces.length > 0 ? [...new Map(ownFaces.map((r) => [r.id, r])).values()] : pool;
  const byRecency = [...facePool].sort(
    (a, b) => Date.parse(b.published_at ?? b.created_at) - Date.parse(a.published_at ?? a.created_at),
  );
  const postedToday = byRecency.some((r) => Date.parse(r.published_at ?? r.created_at) >= windowStart);
  const faces: TodayFace[] = [];
  const seenFace = new Set<string>();
  for (const r of byRecency) {
    const at = r.published_at ?? r.created_at;
    if (postedToday && Date.parse(at) < windowStart) break;
    if (!r.author || seenFace.has(r.author_id)) continue;
    seenFace.add(r.author_id);
    const it = own.get(r.id) ?? items.get(r.id);
    const beat = r.author.profile_config?.specialty?.trim() || it?.sector || it?.themeTag || null;
    faces.push({ ...toAnalyst(r.author), specialty: beat, lastPublishedAt: at });
    if (faces.length >= 16) break;
  }

  // Sidebar lists. Every creator row says whether the reader already follows
  // or pays the analyst, so the same row shows Follow in Trending or Popular
  // and nothing at all once followed; the reader's own row never offers it.
  const known = new Set(deskAuthorIds);
  const rowFor = (p: Profile) => creatorRow(p, markerByAuthor.get(p.id) ?? null, known.has(p.id) || p.id === userId);
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
    .map(rowFor);
  const popularCreators = analysts.slice(0, 8).map(rowFor);

  const tickerTrend = new Map<string, number>();
  const tickerPubs = new Map<string, number>();
  for (const r of pool) {
    const sym = r.ticker?.toUpperCase();
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
  const tickerRow = (symbol: string): TodayTickerRow => ({
    symbol,
    price: quotes.get(symbol)?.price ?? null,
    changePercent: quotes.get(symbol)?.changePercent ?? null,
    publications: coverage[symbol] ?? tickerPubs.get(symbol) ?? 0,
  });

  const sidebar: TodaySidebarPayload = {
    trendingCreators,
    popularCreators,
    trendingTickers: trendingSyms.map(tickerRow),
    popularTickers: popularSyms.map(tickerRow),
    memberships: deskProfiles.filter((p) => memberSet.has(p.id)).map(rowFor),
    following: deskProfiles.filter((p) => !memberSet.has(p.id)).map(rowFor),
    signedIn: Boolean(userId),
  };

  return {
    dateISO,
    publishedToday,
    personalized: Boolean(userId),
    lead,
    faces: { today: postedToday, people: faces },
    minute,
    desk,
    cluster,
    reading,
    news: [],
    sidebar,
  };
}
