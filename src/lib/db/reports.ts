import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/db/auth";
import { listDismissedReportIds } from "@/lib/db/feed-dismissals";
import { tickersInCapBand } from "@/lib/db/tickers";
import type { CapBand } from "@/lib/market/cap-bands";
import type { AccessType, ContentType, Prediction, Report } from "@/lib/types";

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
    const dismissed = userId ? new Set(await listDismissedReportIds(userId)) : new Set<string>();
    const merged: FeedFilters = { ...filters, type: filters.type ?? type };
    const needsOverfetch =
      dismissed.size > 0 ||
      (merged.minScore != null && merged.minScore > 0) ||
      Boolean(merged.ticker) ||
      merged.status != null;
    const fetchLimit = needsOverfetch ? Math.min(200, Math.max(limit * 4, limit + dismissed.size)) : limit;

    const mcapTickers = merged.mcap ? await tickersInCapBand(merged.mcap) : undefined;
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
  const dismissed = userId ? new Set(await listDismissedReportIds(userId)) : new Set<string>();
  const needsOverfetch =
    dismissed.size > 0 ||
    (filters.minScore != null && filters.minScore > 0) ||
    Boolean(filters.ticker) ||
    filters.status != null;
  const fetchLimit = needsOverfetch ? Math.min(200, Math.max(limit * 4, limit + dismissed.size)) : limit;

  const mcapTickers = filters.mcap ? await tickersInCapBand(filters.mcap) : undefined;
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

export async function getReport(id: string): Promise<Report | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("reports").select(SELECT).eq("id", id).maybeSingle();
    if (!data) return null;
    const report = normalize(asReportRow(data));
    const { data: bodyRow } = await supabase
      .from("report_bodies")
      .select("body")
      .eq("report_id", id)
      .maybeSingle();
    report.body = (bodyRow as { body: string | null } | null)?.body ?? null;
    return report;
  } catch {
    return null;
  }
}

/** Load a draft for the compose editor. Returns null if missing or not a draft. */
export async function getDraftForAuthor(
  id: string,
  authorId: string,
): Promise<Report | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(SELECT)
    .eq("id", id)
    .eq("author_id", authorId)
    .eq("status", "draft")
    .maybeSingle();
  if (!data) return null;
  const report = normalize(asReportRow(data));
  const { data: bodyRow } = await supabase
    .from("report_bodies")
    .select("body")
    .eq("report_id", id)
    .maybeSingle();
  report.body = (bodyRow as { body: string | null } | null)?.body ?? null;
  return report;
}

export async function getReportsByIds(ids: string[]): Promise<Report[]> {
  const rows = await Promise.all(ids.map((id) => getReport(id)));
  return rows.filter((r): r is Report => r != null);
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

/** Map of ticker -> count of publicly visible reports covering it. */
export async function tickerCoverage(): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reports")
      .select("ticker")
      .in("status", ["published", "resolution_pending_review"])
      .not("ticker", "is", null)
      .limit(2000);
    const counts: Record<string, number> = {};
    for (const row of (data as { ticker: string | null }[]) ?? []) {
      if (row.ticker) counts[row.ticker] = (counts[row.ticker] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function listByTicker(ticker: string, limit = 30): Promise<Report[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(SELECT)
    .in("status", ["published", "resolution_pending_review"])
    .eq("ticker", ticker.toUpperCase())
    .order("published_at", { ascending: false })
    .limit(limit);
  return asReportRows(data).map(normalize);
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
export async function publishedReportCount(ticker: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("ticker", ticker.toUpperCase())
    .in("status", ["published", "resolution_pending_review"])
    .not("locked_at", "is", null);
  return count ?? 0;
}

/** Coverage counts for every ticker with at least one locked report --
 * powers the sitemap's tickers list and its priority tiering. */
export async function allTickerCoverage(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("ticker")
    .in("status", ["published", "resolution_pending_review"])
    .not("locked_at", "is", null)
    .not("ticker", "is", null)
    .limit(5000);
  const counts: Record<string, number> = {};
  for (const row of (data as { ticker: string | null }[]) ?? []) {
    if (row.ticker) counts[row.ticker] = (counts[row.ticker] ?? 0) + 1;
  }
  return counts;
}

/** Locked report ids + lock timestamps for the sitemap's report entries. */
export async function listLockedReportRoutes(
  limit = 5000,
): Promise<{ id: string; locked_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, locked_at")
    .in("status", ["published", "resolution_pending_review"])
    .not("locked_at", "is", null)
    .order("locked_at", { ascending: false })
    .limit(limit);
  return (data as { id: string; locked_at: string }[]) ?? [];
}
