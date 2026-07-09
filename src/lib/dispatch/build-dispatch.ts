import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/db/auth";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { listSavedReports } from "@/lib/db/saved";
import { listTopAnalysts } from "@/lib/db/profiles";
import { resolvedCountByAuthor } from "@/lib/db/predictions";
import type { Prediction, Profile, Report } from "@/lib/types";
import { fallbackIssueNumber, getCycleWindow } from "@/lib/dispatch/cycle";
import {
  estimateReadMinutes,
  inCycle,
  scoreReportForDispatch,
  scoreResolvedPrediction,
  storyDek,
  storyHeadline,
  walkCycleOffsets,
} from "@/lib/dispatch/ranking";
import type {
  DispatchCycle,
  DispatchLeaderboardEntry,
  DispatchLedgerRow,
  DispatchPayload,
  DispatchStory,
} from "@/lib/dispatch/types";

const SELECT =
  "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalizeReport(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  const prediction = (raw ?? null) as Prediction | null;
  return { ...(row as unknown as Report), prediction };
}

async function fetchIssueNumber(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("bump_dispatch_issue");
    if (!error && typeof data === "number") return data;
  } catch {
    // migration may not be applied locally
  }
  return fallbackIssueNumber(getCycleWindow().dateIso);
}

async function fetchPublishedReports(limit = 80): Promise<Report[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeReport);
}

async function fetchResolvedPredictions(since: Date, limit = 40): Promise<
  (Prediction & { author?: Profile; report?: { id: string; ticker: string | null } })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select(
      "*, author:profiles!predictions_author_id_fkey(handle, display_name), report:reports!predictions_report_id_fkey(id, ticker)",
    )
    .neq("outcome", "open")
    .gte("resolves_at", since.toISOString())
    .order("resolves_at", { ascending: false })
    .limit(limit);
  return (data as (Prediction & {
    author?: Profile;
    report?: { id: string; ticker: string | null };
  })[]) ?? [];
}

function toStory(report: Report): DispatchStory | null {
  const author = report.author;
  if (!author) return null;
  return {
    report,
    author,
    prediction: report.prediction ?? null,
    headline: storyHeadline(report),
    dek: storyDek(report),
  };
}

function filterPersonalized(
  reports: Report[],
  authorIds: Set<string>,
  tickers: Set<string>,
  strict = false,
): Report[] {
  if (authorIds.size === 0 && tickers.size === 0) return strict ? [] : reports;
  return reports.filter((r) => {
    if (authorIds.has(r.author_id)) return true;
    const t = (r.ticker ?? r.prediction?.ticker ?? "").toUpperCase();
    return t && tickers.has(t);
  });
}

async function fetchRecentViewedAuthorIds(userId: string, limit = 12): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_views")
    .select("report:reports(author_id)")
    .eq("viewer_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = new Set<string>();
  for (const row of (data as unknown as { report: { author_id: string } | null }[]) ?? []) {
    if (row.report?.author_id) ids.add(row.report.author_id);
  }
  return [...ids];
}

async function buildPersonalizationSets(userId: string): Promise<{
  authorIds: Set<string>;
  tickers: Set<string>;
}> {
  const [followed, subscribed, saved, recentAuthors] = await Promise.all([
    followedAnalystIds(userId),
    subscribedAnalystIds(userId),
    listSavedReports(userId, 16),
    fetchRecentViewedAuthorIds(userId),
  ]);

  const authorIds = new Set([...followed, ...subscribed, ...recentAuthors]);
  const tickers = new Set<string>();

  for (const report of saved) {
    if (report.author_id) authorIds.add(report.author_id);
    const t = (report.ticker ?? report.prediction?.ticker ?? "").toUpperCase();
    if (t) tickers.add(t);
  }

  return { authorIds, tickers };
}

function pickStories(
  reports: Report[],
  cycleStart: Date,
  cycleEnd: Date,
): { lead: DispatchStory | null; secondary: DispatchStory[]; wire: DispatchStory[] } {
  const ranked = [...reports]
    .map((r) => ({ r, score: scoreReportForDispatch(r, cycleStart, cycleEnd) }))
    .sort((a, b) => b.score - a.score);

  const leadRow = ranked[0]?.r;
  const lead = leadRow ? toStory(leadRow) : null;
  const secondary = ranked
    .slice(1, 5)
    .map(({ r }) => toStory(r))
    .filter((s): s is DispatchStory => s != null);
  const wire = ranked
    .slice(5, 12)
    .map(({ r }) => toStory(r))
    .filter((s): s is DispatchStory => s != null);

  return { lead, secondary, wire };
}

function normalizeOutcome(outcome: Prediction["outcome"]): DispatchLedgerRow["outcome"] | null {
  if (outcome === "open") return null;
  if (outcome === "neutral") return "partial";
  return outcome;
}

function buildLedger(
  predictions: (Prediction & {
    author?: Profile;
    report?: { id: string; ticker: string | null };
  })[],
  cycleStart: Date,
  cycleEnd: Date,
  personalized: boolean,
  authorIds: Set<string>,
  tickers: Set<string>,
): DispatchLedgerRow[] {
  return predictions
    .filter((p) => inCycle(p.resolves_at, cycleStart, cycleEnd))
    .filter((p) => {
      if (!personalized) return true;
      if (authorIds.has(p.author_id)) return true;
      const t = (p.ticker ?? p.report?.ticker ?? "").toUpperCase();
      return t && tickers.has(t);
    })
    .sort((a, b) => scoreResolvedPrediction(b) - scoreResolvedPrediction(a))
    .slice(0, 12)
    .flatMap((p) => {
      const outcome = normalizeOutcome(p.outcome);
      if (!outcome) return [];
      return [
        {
          ticker: (p.ticker ?? p.report?.ticker ?? "-").toUpperCase(),
          authorHandle: p.author?.handle ?? "analyst",
          authorName: p.author?.display_name ?? "Analyst",
          targetPrice: p.target_price,
          resolvedPrice: p.resolved_price,
          returnPct: p.return_pct,
          outcome,
          resolvedAt: p.resolves_at,
          reportId: p.report_id,
        },
      ];
    });
}

async function buildLeaderboard(): Promise<DispatchLeaderboardEntry[]> {
  const top = await listTopAnalysts(5);
  if (top.length === 0) return [];
  return Promise.all(
    top.map(async (analyst) => ({
      analyst,
      resolvedCalls: await resolvedCountByAuthor(analyst.id),
    })),
  );
}

export async function buildDispatch(personalized: boolean): Promise<DispatchPayload> {
  const userId = personalized ? await getSessionUserId() : null;
  const issueNumber = await fetchIssueNumber();

  let authorIds = new Set<string>();
  const tickers = new Set<string>();
  if (userId) {
    const signals = await buildPersonalizationSets(userId);
    authorIds = signals.authorIds;
    for (const t of signals.tickers) tickers.add(t);
  }

  const allReports = await fetchPublishedReports();
  let cycleWindow = getCycleWindow();
  let fallbackCycle = false;

  const pool = personalized
    ? filterPersonalized(allReports, authorIds, tickers, true)
    : allReports;

  let inWindow = pool.filter((r) =>
    inCycle(r.published_at ?? r.created_at, cycleWindow.start, cycleWindow.end),
  );

  if (inWindow.length === 0) {
    for (const offset of walkCycleOffsets(7).slice(1)) {
      const candidate = getCycleWindow(new Date(), offset);
      const hits = pool.filter((r) =>
        inCycle(r.published_at ?? r.created_at, candidate.start, candidate.end),
      );
      if (hits.length > 0) {
        cycleWindow = candidate;
        inWindow = hits;
        fallbackCycle = true;
        break;
      }
    }
  }

  if (inWindow.length === 0) inWindow = pool.slice(0, 12);

  const { lead, secondary, wire } = pickStories(
    inWindow.length ? inWindow : pool,
    cycleWindow.start,
    cycleWindow.end,
  );

  const resolvedSince = new Date(cycleWindow.start.getTime() - 7 * 86_400_000);
  const resolvedRaw = await fetchResolvedPredictions(resolvedSince);
  const resolved = buildLedger(
    resolvedRaw,
    cycleWindow.start,
    cycleWindow.end,
    Boolean(userId && personalized),
    authorIds,
    tickers,
  );

  const readTexts = [
    lead?.headline ?? "",
    lead?.dek ?? "",
    ...secondary.flatMap((s) => [s.headline, s.dek ?? ""]),
    ...wire.map((s) => s.headline),
  ];
  const readMinutes = estimateReadMinutes(readTexts);

  const cycle: DispatchCycle = {
    issueNumber,
    date: cycleWindow.dateIso,
    cycleStart: cycleWindow.start.toISOString(),
    cycleEnd: cycleWindow.end.toISOString(),
    fallbackCycle,
  };

  const leaderboard = userId ? await buildLeaderboard() : [];

  return {
    cycle,
    readMinutes,
    personalized: Boolean(userId && personalized),
    followedCount: authorIds.size,
    lead,
    secondary,
    wire,
    resolved,
    leaderboard,
  };
}
