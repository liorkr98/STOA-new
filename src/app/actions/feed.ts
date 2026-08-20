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
 * Posts a comment or a one-level reply from the Feed, in the Feed's shape.
 * A reply to a reply is rejected by the database trigger, so the caller should
 * pass the top-level comment's id as `parentId`.
 */
export async function postFeedComment(reportId: string, body: string, parentId: string | null): Promise<FeedComment | null> {
  const { supabase, userId } = await requireUser();
  const text = body.trim();
  if (!text) return null;
  const { data, error } = await supabase
    .from("comments")
    .insert({ report_id: reportId, author_id: userId, body: text, parent_id: parentId })
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .single();
  if (error || !data) return null;
  const c = data as Comment;
  const { data: report } = await supabase.from("reports").select("author_id").eq("id", reportId).maybeSingle();
  revalidatePath(`/report/${reportId}`);
  return {
    id: c.id,
    parentId: c.parent_id ?? null,
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

/**
 * Toggle the reader's like on a comment. Per-user rows (comment_likes) rather
 * than a bare counter, so the UI can render the like as on for this reader; a
 * trigger keeps `comments.likes` in step for existing reads.
 */
export async function toggleCommentLike(
  commentId: string,
  liked: boolean,
): Promise<{ ok: boolean; liked: boolean }> {
  const { supabase, userId } = await requireUser();

  if (liked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    return { ok: !error, liked: error ? liked : false };
  }

  const { error } = await supabase
    .from("comment_likes")
    .upsert({ comment_id: commentId, user_id: userId }, { onConflict: "comment_id,user_id" });
  return { ok: !error, liked: error ? liked : true };
}
