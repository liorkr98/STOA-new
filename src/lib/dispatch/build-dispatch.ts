import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/db/auth";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { listSavedReports } from "@/lib/db/saved";
import type { Report } from "@/lib/types";
import { getCycleWindow } from "@/lib/dispatch/cycle";
import { getIssueNumber } from "@/lib/dispatch/issue-number";
import { cachedPage } from "@/lib/cache/page";
import {
  estimateReadMinutes,
  inCycle,
  scoreReportForDispatch,
  storyDek,
  storyHeadline,
  walkCycleOffsets,
} from "@/lib/dispatch/ranking";
import type {
  DispatchCycle,
  DispatchPayload,
  DispatchStory,
} from "@/lib/dispatch/types";
import { publicationRow, REPORT_SELECT } from "@/lib/db/publication-row";

const SELECT = REPORT_SELECT;
const normalizeReport = publicationRow;

const fetchIssueNumber = () => getIssueNumber(getCycleWindow().dateIso);

async function fetchPublishedReports(limit = 80): Promise<Report[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("reports")
    .select(SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeReport);
}

function toStory(report: Report): DispatchStory | null {
  const author = report.author;
  if (!author) return null;
  return {
    report,
    author,
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
    const t = (r.ticker ?? "").toUpperCase();
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
    const t = (report.ticker ?? "").toUpperCase();
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

export async function buildDispatch(personalized: boolean): Promise<DispatchPayload> {
  if (!personalized) return cachedPage("dispatch-public", 30, () => assembleDispatch(false));
  return assembleDispatch(true);
}

async function assembleDispatch(personalized: boolean): Promise<DispatchPayload> {
  const [personal, issueNumber, allReports] = await Promise.all([
    (async () => {
      if (!personalized) return { userId: null as string | null, authorIds: new Set<string>(), tickers: new Set<string>() };
      const userId = await getSessionUserId();
      if (!userId) return { userId: null, authorIds: new Set<string>(), tickers: new Set<string>() };
      const signals = await buildPersonalizationSets(userId);
      return { userId, authorIds: signals.authorIds, tickers: signals.tickers };
    })(),
    fetchIssueNumber(),
    fetchPublishedReports(),
  ]);

  const { userId, authorIds, tickers } = personal;
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

  return {
    cycle,
    readMinutes,
    personalized: Boolean(userId && personalized),
    followedCount: authorIds.size,
    lead,
    secondary,
    wire,
  };
}
