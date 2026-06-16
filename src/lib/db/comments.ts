import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/lib/types";

export async function listComments(reportId: string, limit = 50): Promise<Comment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Comment[]) ?? [];
}
