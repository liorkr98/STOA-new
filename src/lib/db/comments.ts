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

/**
 * Newest comments across many reports in one query (the Feed's discussions).
 *
 * Thread-aware: the per-report cap counts top-level comments, and a reply is
 * kept only when its parent survived the cap. Counting replies toward the limit
 * would otherwise orphan them, and the UI has nothing to nest an orphan under.
 */
export async function listCommentsForReports(reportIds: string[], limitPerReport = 30): Promise<Map<string, Comment[]>> {
  const map = new Map<string, Comment[]>();
  if (reportIds.length === 0) return map;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .in("report_id", reportIds)
    .order("created_at", { ascending: false })
    .limit(limitPerReport * reportIds.length * 2);

  const rows = (data as Comment[]) ?? [];
  const keptParents = new Map<string, Set<string>>();

  // Pass 1: take the newest top-level comments per report, up to the cap.
  for (const c of rows) {
    if (c.parent_id) continue;
    const list = map.get(c.report_id) ?? [];
    if (list.length >= limitPerReport) continue;
    list.push(c);
    map.set(c.report_id, list);
    const parents = keptParents.get(c.report_id) ?? new Set<string>();
    parents.add(c.id);
    keptParents.set(c.report_id, parents);
  }

  // Pass 2: attach replies whose parent made the cut.
  for (const c of rows) {
    if (!c.parent_id) continue;
    if (!keptParents.get(c.report_id)?.has(c.parent_id)) continue;
    const list = map.get(c.report_id) ?? [];
    list.push(c);
    map.set(c.report_id, list);
  }

  return map;
}
