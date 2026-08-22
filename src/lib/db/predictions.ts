import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import type { Prediction, Profile } from "@/lib/types";

export type ResolvedCall = Prediction & {
  author?: Pick<Profile, "handle" | "display_name" | "score"> | null;
};

/** Recently resolved calls with their analyst, newest first -- the landing
 * page's proof strip. Real outcomes only, hits and misses alike. */
export async function listRecentResolved(limit = 8): Promise<ResolvedCall[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("predictions")
    .select("*, author:profiles!predictions_author_id_fkey(handle, display_name, score)")
    .neq("outcome", "open")
    .not("return_pct", "is", null)
    .order("resolves_at", { ascending: false })
    .limit(limit);
  return (data as unknown as ResolvedCall[]) ?? [];
}

export type ResolvedCallWithReport = Prediction & {
  author?: Profile | null;
  report?: { id: string; title: string | null; summary: string | null; status: string } | null;
};

/** Recently resolved calls joined to author and report, for Verdicts bands. */
export async function listRecentResolvedWithReports(limit = 24): Promise<ResolvedCallWithReport[]> {
  return cachedPage(`resolved-with-reports:${limit}`, 30, async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("predictions")
      .select(
        "*, author:profiles!predictions_author_id_fkey(*), report:reports!predictions_report_id_fkey(id, title, summary, status)",
      )
      .neq("outcome", "open")
      .not("resolved_price", "is", null)
      .order("resolves_at", { ascending: false })
      .limit(limit);
    return ((data as unknown as ResolvedCallWithReport[]) ?? []).filter(
      (p) => p.author && p.report && p.report.status === "published",
    );
  });
}

export async function listPredictionsByAuthor(
  authorId: string,
  limit = 200,
): Promise<Prediction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("*, reports(status)")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as (Prediction & { reports: { status: string } | null })[]).map(
    ({ reports, ...p }) => ({ ...p, report_status: reports?.status as Prediction["report_status"] }),
  );
}

export async function resolvedCountByAuthor(authorId: string): Promise<number> {
  const counts = await resolvedCountsByAuthors([authorId]);
  return counts[authorId] ?? 0;
}

/**
 * Resolved (non-open) call counts for many analysts in one grouped query.
 * Search used to fire one `count` round trip per analyst card.
 */
export async function resolvedCountsByAuthors(
  authorIds: string[],
): Promise<Record<string, number>> {
  const unique = [...new Set(authorIds.filter(Boolean))];
  const out: Record<string, number> = Object.fromEntries(unique.map((id) => [id, 0]));
  if (unique.length === 0) return out;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("resolved_counts_by_authors", { p_ids: unique });
  if (!error && data) {
    for (const row of data as { author_id: string; resolved_count: number }[]) {
      out[row.author_id] = Number(row.resolved_count);
    }
    return out;
  }

  const { data: rows } = await supabase
    .from("predictions")
    .select("author_id")
    .in("author_id", unique)
    .neq("outcome", "open");
  for (const row of (rows as { author_id: string }[] | null) ?? []) {
    out[row.author_id] = (out[row.author_id] ?? 0) + 1;
  }
  return out;
}

/** Whether any resolved (non-open) call exists for this ticker -- the line
 * between "locked, fact-checked research" and "verified track record" copy. */
export const hasResolvedHistory = cache(async (ticker: string): Promise<boolean> => {
  const supabase = createPublicClient();
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("ticker", ticker.toUpperCase())
    .neq("outcome", "open");
  return (count ?? 0) > 0;
});
