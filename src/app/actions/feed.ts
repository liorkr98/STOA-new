"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FeedComment } from "@/lib/feed/types";
import type { Comment } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  return { supabase, userId: user.id };
}

/**
 * Posts a comment from the Feed and returns it in the Feed's shape.
 * COMMENTS_PLACEHOLDER: the table has no parent_id, so replies post as
 * top-level comments carrying an @mention; parentId is accepted for when it does.
 */
export async function postFeedComment(reportId: string, body: string, parentId: string | null): Promise<FeedComment | null> {
  const { supabase, userId } = await requireUser();
  const text = body.trim();
  if (!text) return null;
  const { data, error } = await supabase
    .from("comments")
    .insert({ report_id: reportId, author_id: userId, body: text })
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .single();
  if (error || !data) return null;
  const c = data as Comment;
  const { data: report } = await supabase.from("reports").select("author_id").eq("id", reportId).maybeSingle();
  void parentId;
  revalidatePath(`/report/${reportId}`);
  return {
    id: c.id,
    parentId: null,
    author: {
      handle: c.author?.handle ?? "",
      displayName: c.author?.display_name ?? "Reader",
      avatarUrl: c.author?.avatar_url ?? null,
      isAuthor: (report as { author_id?: string } | null)?.author_id === userId,
    },
    createdAt: c.created_at,
    text: c.body,
    likes: c.likes ?? 0,
  };
}
