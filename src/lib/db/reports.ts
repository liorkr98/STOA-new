import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import { getSessionUserId } from "@/lib/db/auth";
import { listDismissedReportIds } from "@/lib/db/feed-dismissals";
import { tickersInCapBand } from "@/lib/db/tickers";
import { coverageAllTime } from "@/lib/markets/coverage";
import type { CapBand } from "@/lib/market/cap-bands";
import type { AccessType, ContentType, Prediction, Report } from "@/lib/types";
import type { DraftRow } from "@/lib/compose/drafts";

const SELECT =
  "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalize(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  const prediction = (raw ?? null) as Prediction | null;
  return { ...(row as unknown as Report), prediction };
}

/** Supabase dynamic selects (e.g. !inner joins) widen inferred types; normalize via unknown. */
function asReportRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data as unknown as Record<string, unknown>[];
}

function asReportRow(data: unknown): Record<string, unknown> {
  return data as unknown as Record<string, unknown>;
}

export type FeedSort = "trending" | "recent";

export type CallStatusFilter = "open" | "resolved";

/** Filters applied in the query (and a light post-pass for joined prediction/score). */
export interface FeedFilters {
  type?: ContentType;
  access?: AccessType;
  ticker?: string;
  /** Minimum author Track Score (0-100). */
  minScore?: number;
  status?: CallStatusFilter;
  mcap?: CapBand;
}

function applyJoinedFilters(reports: Report[], filters: FeedFilters): Report[] {
  let out = reports;
  if (filters.minScore != null && filters.minScore > 0) {
    out = out.filter((r) => (r.author?.score ?? 0) >= filters.minScore!);
  }
  // Status is preferably applied via !inner join; keep a safety pass for embeds.
  if (filters.status === "open") {
    out = out.filter((r) => r.prediction != null && r.prediction.outcome === "open");
  } else if (filters.status === "resolved") {
    out = out.filter((r) => r.prediction != null && r.prediction.outcome !== "open");
  }
  if (filters.ticker) {
    const t = filters.ticker.toUpperCase();
    out = out.filter(
      (r) => (r.ticker ?? r.prediction?.ticker ?? "").toUpperCase() === t,
    );
  }
  return out;
}

function selectClause(filters: FeedFilters): string {
  if (filters.status) {
    return "*, author:profiles!reports_author_id_fkey(*), prediction:predictions!inner(*)";
  }
  return SELECT;
}

/**
 * Apply column filters that PostgREST can express on `reports` (and nested prediction).
 * Deliberately synchronous: Supabase query builders are thenables, and an async
 * function that returns one gets its return value silently unwrapped by the
 * runtime (the query executes early and the caller receives `{data, error}`
 * instead of the builder). Callers resolve `mcapTickers` before calling this.
 */
function applyReportColumnFilters(
  // Supabase query builders are chainable but awkward to type here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  filters: FeedFilters,
  mcapTickers?: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.access) q = q.eq("access", filters.access);
  if (filters.mcap) {
    if (!mcapTickers || mcapTickers.length === 0) {
      q = q.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      q = q.in("ticker", mcapTickers);
    }
  }
  if (filters.status === "open") {
    q = q.eq("prediction.outcome", "open");
  } else if (filters.status === "resolved") {
    q = q.neq("prediction.outcome", "open");
  }
  // Ticker is applied in applyJoinedFilters so prediction.ticker also matches.
  return q;
}

export async function listFeed({
  sort = "trending",
  type,
  limit = 30,
  filters = {},
}: {
  sort?: FeedSort;
  type?: ContentType;
  limit?: number;
  filters?: FeedFilters;
} = {}): Promise<Report[]> {
  try {
    const supabase = await createClient();
    const userId = await getSessionUserId();
    const merged: FeedFilters = { ...filters, type: filters.type ?? type };
    const [dismissedList, mcapTickers] = await Promise.all([
      userId ? listDismissedReportIds(userId) : Promise.resolve([] as string[]),
      merged.mcap ? tickersInCapBand(merged.mcap) : Promise.resolve(undefined),
    ]);
    const dismissed = new Set(dismissedList);
    const needsOverfetch =
      dismissed.size > 0 ||
      (merged.minScore != null && merged.minScore > 0) ||
      Boolean(merged.ticker) ||
      merged.status != null;
    const fetchLimit = needsOverfetch
      ? Math.min(200, Math.max(limit * 4, limit + dismissed.size))
      : limit;
    let q = supabase
      .from("reports")
      .select(selectClause(merged))
      .in("status", ["published", "resolution_pending_review"]);
    q = applyReportColumnFilters(q, merged, mcapTickers);
    q =
      sort === "trending"
        ? q.order("likes", { ascending: false })
        : q.order("published_at", { ascending: false });
    const { data } = await q.limit(fetchLimit);
    return applyJoinedFilters(
      asReportRows(data)
        .map(normalize)
        .filter((r) => !dismissed.has(r.id)),
      merged,
    ).slice(0, limit);
  } catch {
    return [];
  }
}

export async function listFeedFromAnalysts(
  analystIds: string[],
  limit = 30,
  filters: FeedFilters = {},
): Promise<Report[]> {
  if (analystIds.length === 0) return [];
  const supabase = await createClient();
  const userId = await getSessionUserId();
  const [dismissedList, mcapTickers] = await Promise.all([
    userId ? listDismissedReportIds(userId) : Promise.resolve([] as string[]),
    filters.mcap ? tickersInCapBand(filters.mcap) : Promise.resolve(undefined),
  ]);
  const dismissed = new Set(dismissedList);
  const needsOverfetch =
    dismissed.size > 0 ||
    (filters.minScore != null && filters.minScore > 0) ||
    Boolean(filters.ticker) ||
    filters.status != null;
  const fetchLimit = needsOverfetch ? Math.min(200, Math.max(limit * 4, limit + dismissed.size)) : limit;
  let q = supabase
    .from("reports")
    .select(selectClause(filters))
    .in("status", ["published", "resolution_pending_review"])
    .in("author_id", analystIds);
  q = applyReportColumnFilters(q, filters, mcapTickers);
  const { data } = await q.order("published_at", { ascending: false }).limit(fetchLimit);
  return applyJoinedFilters(
    asReportRows(data)
      .map(normalize)
      .filter((r) => !dismissed.has(r.id)),
    filters,
  ).slice(0, limit);
}

export const getReport = cache(async (id: string): Promise<Report | null> => {
  try {
    const supabase = await createClient();
    const [reportRes, bodyRes] = await Promise.all([
      supabase.from("reports").select(SELECT).eq("id", id).maybeSingle(),
      supabase.from("report_bodies").select("body").eq("report_id", id).maybeSingle(),
    ]);
    if (!reportRes.data) return null;
    const report = normalize(asReportRow(reportRes.data));
    report.body = (bodyRes.data as { body: string | null } | null)?.body ?? null;
    return report;
  } catch {
    return null;
  }
});

/** Load a draft for the compose editor. Returns null if missing or not a draft. */
export async function getDraftForAuthor(
  id: string,
  authorId: string,
): Promise<Report | null> {
  const supabase = await createClient();
  const [reportRes, bodyRes] = await Promise.all([
    supabase
      .from("reports")
      .select(SELECT)
      .eq("id", id)
      .eq("author_id", authorId)
      .eq("status", "draft")
      .maybeSingle(),
    supabase.from("report_bodies").select("body").eq("report_id", id).maybeSingle(),
  ]);
  if (!reportRes.data) return null;
  const report = normalize(asReportRow(reportRes.data));
  report.body = (bodyRes.data as { body: string | null } | null)?.body ?? null;
  return report;
}

/**
 * A publication the caller authored that is already out, loaded for editing.
 *
 * Separate from getDraftForAuthor on purpose: that one is scoped to drafts, and
 * widening it would have quietly opened every draft-only path to live
 * publications. This is the edit path and it says so.
 */
export async function getPublishedForAuthor(
  id: string,
  authorId: string,
): Promise<Report | null> {
  const supabase = await createClient();
  const [reportRes, bodyRes] = await Promise.all([
    supabase
      .from("reports")
      .select(SELECT)
      .eq("id", id)
      .eq("author_id", authorId)
      .in("status", ["published", "archived", "resolution_pending_review"])
      .maybeSingle(),
    supabase.from("report_bodies").select("body").eq("report_id", id).maybeSingle(),
  ]);
  if (!reportRes.data) return null;
  const report = normalize(asReportRow(reportRes.data));
  report.body = (bodyRes.data as { body: string | null } | null)?.body ?? null;
  return report;
}

/**
 * Status of a report the caller authored, whatever that status is. Compose uses
 * it to tell "this is not yours / does not exist" apart from "this is yours but
 * locked", so opening Edit on a published report explains itself instead of
 * rendering a 404.
 */
export async function getAuthorReportStatus(
  id: string,
  authorId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("status")
    .eq("id", id)
    .eq("author_id", authorId)
    .maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}

export async function getReportsByIds(ids: string[]): Promise<Report[]> {
  if (ids.length === 0) return [];
  const supabase = createPublicClient();
  const { data } = await supabase.from("reports").select(SELECT).in("id", ids);
  const map = new Map(asReportRows(data).map((row) => {
    const report = normalize(row);
    return [report.id, report] as const;
  }));
  return ids.map((id) => map.get(id)).filter((r): r is Report => r != null);
}

export async function listByAuthor(
  authorId: string,
  opts: { status?: "published" | "draft"; limit?: number } = {},
): Promise<Report[]> {
  const supabase = await createClient();
  let q = supabase.from("reports").select(SELECT).eq("author_id", authorId);
  // "published" means "publicly visible": a report awaiting resolution review
  // is still live at its permalink (see resolution_pending_review RLS policies),
  // so it belongs alongside published reports here, not silently excluded.
  if (opts.status === "published") {
    q = q.in("status", ["published", "resolution_pending_review"]);
  } else if (opts.status) {
    q = q.eq("status", opts.status);
  }
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  return asReportRows(data).map(normalize);
}

/** Drafts and published work the author can attach as a companion piece. */
export async function listLinkableByAuthor(
  authorId: string,
  opts: { excludeId?: string; types: ContentType[]; limit?: number } = { types: [] },
): Promise<Pick<Report, "id" | "title" | "summary" | "type" | "status" | "ticker">[]> {
  const supabase = await createClient();
  let q = supabase
    .from("reports")
    .select("id, title, summary, type, status, ticker")
    .eq("author_id", authorId)
    .in("status", ["draft", "published", "resolution_pending_review"])
    .in("type", opts.types)
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 40);
  if (opts.excludeId) q = q.neq("id", opts.excludeId);
  const { data } = await q;
  return (data ?? []) as Pick<Report, "id" | "title" | "summary" | "type" | "status" | "ticker">[];
}

/**
 * The author's drafts as the type picker lists them: the row plus its body,
 * newest touched first. `*` rather than a column list so the draft-call
 * columns (migration 0065) come along once they exist and the query does not
 * fail while they do not.
 */
export async function listDraftsForPicker(authorId: string, limit = 30): Promise<DraftRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, bodies:report_bodies(body)")
    .eq("author_id", authorId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return asReportRows(data).map((row) => {
    const bodies = row.bodies as { body: string | null } | { body: string | null }[] | null | undefined;
    const body = Array.isArray(bodies) ? (bodies[0]?.body ?? null) : (bodies?.body ?? null);
    const r = row as unknown as Report;
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      summary: r.summary,
      body,
      ticker: r.ticker,
      primary_tag: r.primary_tag ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at ?? null,
      draft_direction: r.draft_direction ?? null,
      draft_target_price: r.draft_target_price ?? null,
      draft_horizon_days: r.draft_horizon_days ?? null,
    };
  });
}

/**
 * When the author's most recent verdict went out, for the rolling thirty-day
 * window. Archived verdicts count: taking one down does not earn another.
 */
export async function lastVerdictPublishedAt(authorId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("published_at")
    .eq("author_id", authorId)
    .eq("type", "call")
    .in("status", ["published", "resolution_pending_review", "archived"])
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { published_at: string | null } | null)?.published_at ?? null;
}

/**
 * How often each primary tag is used across published work, most used
 * first. The tag search shows these before anything is typed, the same way
 * Explore's filters lead with the most-covered names.
 */
export async function listTagUsage(): Promise<string[]> {
  return cachedPage("tag-usage", 300, async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("reports")
      .select("primary_tag")
      .in("status", ["published", "resolution_pending_review"])
      .not("primary_tag", "is", null)
      .limit(2000);
    const counts = new Map<string, number>();
    for (const row of (data as { primary_tag: string | null }[] | null) ?? []) {
      if (!row.primary_tag) continue;
      counts.set(row.primary_tag, (counts.get(row.primary_tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
  });
}

/** Newest publicly visible publications platform-wide, with author and prediction. */
export async function listRecentPublished(limit = 80): Promise<Report[]> {
  return cachedPage(`reports:recent:${limit}`, 20, async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("reports")
      .select(SELECT)
      .in("status", ["published", "resolution_pending_review"])
      .order("published_at", { ascending: false })
      .limit(limit);
    return asReportRows(data).map(normalize);
  });
}

/** Newest publicly visible publications by a set of authors (the reader's desk). */
export async function listPublishedByAuthors(authorIds: string[], limit = 24): Promise<Report[]> {
  if (authorIds.length === 0) return [];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("reports")
    .select(SELECT)
    .in("status", ["published", "resolution_pending_review"])
    .in("author_id", authorIds)
    .order("published_at", { ascending: false })
    .limit(limit);
  return asReportRows(data).map(normalize);
}

/**
 * Map of ticker -> count of publicly visible reports covering it.
 *
 * Grouped in Postgres and cached (see src/lib/markets/coverage.ts). This used to
 * ship up to 2000 report rows per request to be counted in Node, on Today, the
 * landing tape, Markets and every ticker page.
 */
export async function tickerCoverage(): Promise<Record<string, number>> {
  try {
    const map = await coverageAllTime();
    return Object.fromEntries(map);
  } catch {
    return {};
  }
}

export async function listByTicker(ticker: string, limit = 30): Promise<Report[]> {
  const sym = ticker.toUpperCase();
  return cachedPage(`reports:ticker:${sym}:${limit}`, 20, async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("reports")
      .select(SELECT)
      .in("status", ["published", "resolution_pending_review"])
      .eq("ticker", sym)
      .order("published_at", { ascending: false })
      .limit(limit);
    return asReportRows(data).map(normalize);
  });
}

/**
 * Single guard for "does this ticker have any real, locked content" -- used by
 * both the /markets/[ticker] noindex decision and sitemap.ts's inclusion
 * filter. One query shape in one place so the two can't drift out of sync (a
 * ticker page and its sitemap entry disagreeing on indexability is its own
 * SEO bug). Locked (not just published) means genuinely immutable content;
 * resolution_pending_review is included since the report itself never
 * unpublished, only one call's grading is waiting on market data.
 */
export const publishedReportCount = cache(async (ticker: string): Promise<number> => {
  const supabase = createPublicClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("ticker", ticker.toUpperCase())
    .in("status", ["published", "resolution_pending_review"])
    .not("locked_at", "is", null);
  return count ?? 0;
});

/** Coverage counts for every ticker with at least one locked report --
 * powers the sitemap's tickers list and its priority tiering. */
export async function allTickerCoverage(): Promise<Record<string, number>> {
  try {
    return Object.fromEntries(await coverageAllTime());
  } catch {
    return {};
  }
}

/** Locked report ids + lock timestamps for the sitemap's report entries. */
export async function listLockedReportRoutes(
  limit = 5000,
): Promise<{ id: string; locked_at: string }[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("reports")
    .select("id, locked_at")
    .in("status", ["published", "resolution_pending_review"])
    .not("locked_at", "is", null)
    .order("locked_at", { ascending: false })
    .limit(limit);
  return (data as { id: string; locked_at: string }[]) ?? [];
}
