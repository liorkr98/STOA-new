import { createClient } from "@/lib/supabase/server";
import type { Prediction, Profile } from "@/lib/types";

export type ResolvedCall = Prediction & {
  author?: Pick<Profile, "handle" | "display_name" | "score"> | null;
};

/** Recently resolved calls with their analyst, newest first -- the landing
 * page's proof strip. Real outcomes only, hits and misses alike. */
export async function listRecentResolved(limit = 8): Promise<ResolvedCall[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("*, author:profiles!predictions_author_id_fkey(handle, display_name, score)")
    .neq("outcome", "open")
    .not("return_pct", "is", null)
    .order("resolves_at", { ascending: false })
    .limit(limit);
  return (data as unknown as ResolvedCall[]) ?? [];
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
  const supabase = await createClient();
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .neq("outcome", "open");
  return count ?? 0;
}

/** Whether any resolved (non-open) call exists for this ticker -- the line
 * between "locked, fact-checked research" and "verified track record" copy. */
export async function hasResolvedHistory(ticker: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("ticker", ticker.toUpperCase())
    .neq("outcome", "open");
  return (count ?? 0) > 0;
}
