import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listSavedReports } from "@/lib/db/saved";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { listTopAnalysts } from "@/lib/db/profiles";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { getCycleWindow } from "@/lib/dispatch/cycle";
import type { Prediction, Profile, Report } from "@/lib/types";
import type {
  TodayAnalyst,
  TodayItem,
  TodayPayload,
  TodaySavedItem,
  TodaySavedReason,
  TodayStanding,
  TodayVerdict,
  TodayVideo,
} from "@/lib/today/types";

const REPORT_SELECT =
  "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

const PROVISIONAL_BELOW = 10;
const STANDINGS_SIZE = 8;

function normalizeReport(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  return { ...(row as unknown as Report), prediction: (raw ?? null) as Prediction | null };
}

function toAnalyst(profile: Profile): TodayAnalyst {
  return {
    handle: profile.handle,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    score: profile.score || null,
    provisional: (profile.sample_size ?? 0) < PROVISIONAL_BELOW,
  };
}

/**
 * Content facets. CALL and THESIS are read off the report; VIDEO and CARDS are
 * assumed, matching the existing lead-story treatment -- the content model does
 * not yet expose per-publication flags for either.
 */
function contentBadge(report: Report): string[] {
  const badge = ["Video"];
  if (report.prediction || report.type === "call") badge.push("Call");
  badge.push("Cards");
  if (report.body) badge.push("Thesis");
  return badge;
}

function toItem(report: Report, saved: boolean, thumb: TodayItem["thumb"] = null): TodayItem | null {
  if (!report.author) return null;
  return {
    reportId: report.id,
    type: report.type,
    ticker: report.ticker ?? report.prediction?.ticker ?? null,
    direction: report.prediction?.direction ?? null,
    contentBadge: contentBadge(report),
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: toAnalyst(report.author),
    publishedAt: report.published_at ?? report.created_at,
    access: report.access,
    price: report.price,
    saved,
    thumb,
  };
}

async function fetchReportsByAuthors(authorIds: string[], limit: number): Promise<Report[]> {
  if (authorIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("status", "published")
    .in("author_id", authorIds)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeReport);
}

/** Global discovery pool: published work, newest first, filtered by caller. */
async function fetchRecentReports(limit: number): Promise<Report[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeReport);
}

async function fetchSavedIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_reports").select("report_id").eq("user_id", userId);
  return new Set(((data as { report_id: string }[]) ?? []).map((r) => r.report_id));
}

async function fetchSavedAt(userId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_reports")
    .select("report_id, created_at")
    .eq("user_id", userId);
  const map = new Map<string, string>();
  for (const row of (data as { report_id: string; created_at: string }[]) ?? []) {
    map.set(row.report_id, row.created_at);
  }
  return map;
}

async function fetchViewedReportIds(userId: string, reportIds: string[]): Promise<Set<string>> {
  if (reportIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_views")
    .select("report_id")
    .eq("viewer_id", userId)
    .in("report_id", reportIds);
  return new Set(((data as { report_id: string }[]) ?? []).map((r) => r.report_id));
}

/**
 * Verdicts is a discovery department: resolved calls from analysts the reader
 * does NOT follow, so the band widens their world rather than mirroring it.
 */
async function fetchVerdicts(excludeAuthorIds: Set<string>, limit: number): Promise<TodayVerdict[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select(
      "*, author:profiles!predictions_author_id_fkey(*), report:reports!predictions_report_id_fkey(id, title, summary, status)",
    )
    .neq("outcome", "open")
    .not("resolved_price", "is", null)
    .order("resolves_at", { ascending: false })
    .limit(limit * 4);

  const rows = (data as (Prediction & {
    author?: Profile | null;
    report?: { id: string; title: string | null; summary: string | null; status: string } | null;
  })[]) ?? [];

  const outside: TodayVerdict[] = [];
  const inside: TodayVerdict[] = [];

  for (const p of rows) {
    if (!p.author || !p.report || p.report.status !== "published") continue;
    if (p.outcome === "open") continue;
    const verdict: TodayVerdict = {
      reportId: p.report.id,
      ticker: p.ticker.toUpperCase(),
      direction: p.direction,
      outcome: p.outcome,
      headline: p.report.title?.trim() || p.report.summary?.trim() || `${p.ticker.toUpperCase()} call`,
      entryPrice: p.lock_price,
      exitPrice: p.resolved_price,
      returnPct: p.return_pct,
      resolvedAt: p.resolution_trading_date ?? p.resolves_at,
      author: toAnalyst(p.author),
    };
    (excludeAuthorIds.has(p.author_id) ? inside : outside).push(verdict);
  }

  // Discovery first, then trending calls the reader may already follow.
  return [...outside, ...inside].slice(0, limit);
}

function savedReason(
  report: Report,
  followUpAuthorIds: Set<string>,
  viewed: Set<string>,
): TodaySavedReason | null {
  const outcome = report.prediction?.outcome;
  if (outcome === "hit") return "resolved_hit";
  if (outcome === "miss") return "resolved_miss";
  if (followUpAuthorIds.has(report.author_id)) return "follow_up";
  if (!viewed.has(report.id)) return "unread";
  return null;
}

async function buildSaved(userId: string): Promise<TodaySavedItem[]> {
  const savedReports = await listSavedReports(userId, 24);
  if (savedReports.length === 0) return [];

  const savedAtById = await fetchSavedAt(userId);
  const reportIds = savedReports.map((r) => r.id);
  const viewed = await fetchViewedReportIds(userId, reportIds);

  // An analyst counts as having followed up when they published again after
  // the reader saved their earlier piece.
  const authorIds = [...new Set(savedReports.map((r) => r.author_id))];
  const laterReports = await fetchReportsByAuthors(authorIds, 60);
  const followUpAuthorIds = new Set<string>();
  for (const saved of savedReports) {
    const savedAt = savedAtById.get(saved.id);
    if (!savedAt) continue;
    const hasNewer = laterReports.some(
      (r) =>
        r.author_id === saved.author_id &&
        r.id !== saved.id &&
        (r.published_at ?? r.created_at) > savedAt,
    );
    if (hasNewer) followUpAuthorIds.add(saved.author_id);
  }

  const items: TodaySavedItem[] = [];
  for (const report of savedReports) {
    const savedAt = savedAtById.get(report.id);
    if (!savedAt) continue;
    const reason = savedReason(report, followUpAuthorIds, viewed);
    if (!reason) continue;
    const item = toItem(report, true);
    if (!item) continue;
    items.push({ ...item, reason, savedAt });
  }

  const priority: Record<TodaySavedReason, number> = {
    resolved_hit: 0,
    resolved_miss: 1,
    follow_up: 2,
    unread: 3,
  };
  return items.sort((a, b) => priority[a.reason] - priority[b.reason]).slice(0, 3);
}

async function buildMostWatched(limit: number): Promise<TodayVideo[]> {
  const clips = await listVideoClipCards(24);
  return clips
    .flatMap((clip) => {
      const report = clip.report;
      if (!report?.author) return [];
      return [
        {
          reportId: report.id,
          videoId: clip.id,
          headline: storyHeadline(report),
          thumbnailUrl: clip.thumbnail_url,
          durationSeconds: clip.duration_seconds,
          ticker: report.ticker ?? report.prediction?.ticker ?? null,
          contentBadge: contentBadge(report),
          publicationViews: report.views ?? 0,
          author: toAnalyst(report.author),
        } satisfies TodayVideo,
      ];
    })
    .sort((a, b) => b.publicationViews - a.publicationViews)
    .slice(0, limit);
}

async function buildStandings(): Promise<TodayStanding[]> {
  const top = await listTopAnalysts(STANDINGS_SIZE);
  if (top.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("author_id, outcome")
    .in(
      "author_id",
      top.map((a) => a.id),
    )
    .neq("outcome", "open");

  const tally = new Map<string, { hits: number; resolved: number }>();
  for (const row of (data as { author_id: string; outcome: string }[]) ?? []) {
    const entry = tally.get(row.author_id) ?? { hits: 0, resolved: 0 };
    entry.resolved += 1;
    if (row.outcome === "hit") entry.hits += 1;
    tally.set(row.author_id, entry);
  }

  return top.map((analyst, index) => {
    const entry = tally.get(analyst.id);
    return {
      rank: index + 1,
      analyst: toAnalyst(analyst),
      hitRatePct:
        entry && entry.resolved > 0 ? Math.round((entry.hits / entry.resolved) * 100) : null,
      resolvedCalls: entry?.resolved ?? 0,
    };
  });
}

/**
 * Publications carrying each symbol that went out in the current dispatch
 * cycle. Backs the Your Tickers band, whose symbol list lives in the reader's
 * browser rather than the database.
 */
export async function countPublicationsThisCycle(
  symbols: string[],
): Promise<Map<string, number>> {
  const wanted = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const counts = new Map<string, number>(wanted.map((s) => [s, 0]));
  if (wanted.length === 0) return counts;

  const { start, end } = getCycleWindow();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("ticker, published_at")
    .eq("status", "published")
    .in("ticker", wanted)
    .gte("published_at", start.toISOString())
    .lte("published_at", end.toISOString());

  for (const row of (data as { ticker: string | null }[]) ?? []) {
    const sym = row.ticker?.toUpperCase();
    if (!sym || !counts.has(sym)) continue;
    counts.set(sym, (counts.get(sym) ?? 0) + 1);
  }
  return counts;
}

export async function buildToday(userId: string): Promise<TodayPayload> {
  const [subscribedIds, followedIds, savedIds] = await Promise.all([
    subscribedAnalystIds(userId),
    followedAnalystIds(userId),
    fetchSavedIds(userId),
  ]);

  const deskAuthorIds = new Set([...subscribedIds, ...followedIds]);

  const [subscriptionReports, followingReports, discoveryPool, saved, mostWatched, standings] =
    await Promise.all([
      fetchReportsByAuthors(subscribedIds, 12),
      fetchReportsByAuthors(followedIds, 12),
      fetchRecentReports(40),
      buildSaved(userId),
      buildMostWatched(4),
      buildStandings(),
    ]);

  const verdicts = await fetchVerdicts(deskAuthorIds, 5);

  const toItems = (reports: Report[], limit: number) =>
    reports
      .flatMap((r) => {
        const item = toItem(r, savedIds.has(r.id));
        return item ? [item] : [];
      })
      .slice(0, limit);

  // A subscribed analyst the reader also follows belongs in the paid column
  // only, so the two Your Desk columns never show the same publication twice.
  const subscriptions = toItems(subscriptionReports, 4);
  const subscriptionIds = new Set(subscriptions.map((i) => i.reportId));
  const following = toItems(
    followingReports.filter((r) => !subscriptionIds.has(r.id)),
    4,
  );

  const worthReading = toItems(
    discoveryPool.filter((r) => !deskAuthorIds.has(r.author_id) && r.author_id !== userId),
    6,
  );

  return {
    desk: { subscriptions, following },
    verdicts,
    saved,
    mostWatched,
    standings,
    worthReading,
  };
}
