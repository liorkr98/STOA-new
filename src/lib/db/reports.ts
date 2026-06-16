import { createClient } from "@/lib/supabase/server";
import type { ContentType, Prediction, Report } from "@/lib/types";

const SELECT =
  "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalize(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  const prediction = (raw ?? null) as Prediction | null;
  return { ...(row as unknown as Report), prediction };
}

export type FeedSort = "trending" | "recent";

export async function listFeed({
  sort = "trending",
  type,
  limit = 30,
}: {
  sort?: FeedSort;
  type?: ContentType;
  limit?: number;
} = {}): Promise<Report[]> {
  try {
    const supabase = await createClient();
    let q = supabase.from("reports").select(SELECT).eq("status", "published");
    if (type) q = q.eq("type", type);
    q =
      sort === "trending"
        ? q.order("likes", { ascending: false })
        : q.order("published_at", { ascending: false });
    const { data } = await q.limit(limit);
    return ((data as Record<string, unknown>[]) ?? []).map(normalize);
  } catch {
    return [];
  }
}

export async function listFeedFromAnalysts(
  analystIds: string[],
  limit = 30,
): Promise<Report[]> {
  if (analystIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(SELECT)
    .eq("status", "published")
    .in("author_id", analystIds)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(normalize);
}

export async function getReport(id: string): Promise<Report | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("reports").select(SELECT).eq("id", id).maybeSingle();
    if (!data) return null;
    const report = normalize(data as Record<string, unknown>);
    // Body lives in report_bodies and is gated by RLS: it only comes back if the
    // viewer is allowed to read it (free report, author, unlock, or subscriber).
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

export async function listByAuthor(
  authorId: string,
  opts: { status?: "published" | "draft"; limit?: number } = {},
): Promise<Report[]> {
  const supabase = await createClient();
  let q = supabase.from("reports").select(SELECT).eq("author_id", authorId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  return ((data as Record<string, unknown>[]) ?? []).map(normalize);
}

/** Map of ticker -> count of published reports covering it. */
export async function tickerCoverage(): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reports")
      .select("ticker")
      .eq("status", "published")
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
    .eq("status", "published")
    .eq("ticker", ticker.toUpperCase())
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(normalize);
}
