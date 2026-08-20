import { createPublicClient } from "@/lib/supabase/public";
import type { Comment } from "@/lib/types";

export async function listComments(reportId: string, limit = 50): Promise<Comment[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Comment[]) ?? [];
}

/** Newest comments across many reports in one query (the Feed's discussions). */
export async function listCommentsForReports(reportIds: string[], limitPerReport = 30): Promise<Map<string, Comment[]>> {
  const map = new Map<string, Comment[]>();
  if (reportIds.length === 0) return map;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .in("report_id", reportIds)
    .order("created_at", { ascending: false })
    .limit(limitPerReport * reportIds.length);
  for (const c of (data as Comment[]) ?? []) {
    const list = map.get(c.report_id) ?? [];
    if (list.length < limitPerReport) list.push(c);
    map.set(c.report_id, list);
  }
  return map;
}
