"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/db/auth";
import { listComments, listLikedCommentIds } from "@/lib/db/comments";
import { toFeedComment } from "@/lib/feed/comments";
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
 * Posts a comment or a one-level reply, in the shape every discussion renders.
 * A reply to a reply is rejected by the database trigger, so the caller should
 * pass the top-level comment's id as `parentId`. The analyst is notified the
 * same way from every surface.
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
  const { data: report } = await supabase.from("reports").select("author_id").eq("id", reportId).maybeSingle();
  try {
    await supabase.rpc("notify_report_event", { p_report_id: reportId, p_kind: "comment" });
  } catch {
    // A missed notification is not a failed comment.
  }
  revalidatePath(`/report/${reportId}`);
  return toFeedComment(data as Comment, {
    reportAuthorId: (report as { author_id?: string } | null)?.author_id ?? null,
    viewerId: userId,
  });
}

/** Newest comments for one publication, with this reader's likes painted on. */
export async function loadFeedComments(reportId: string, authorId: string): Promise<FeedComment[]> {
  const comments = await listComments(reportId, 50);
  const userId = await getSessionUserId();
  const likedIds = userId ? await listLikedCommentIds(userId, comments.map((c) => c.id)) : new Set<string>();
  return comments.map((c) => toFeedComment(c, { reportAuthorId: authorId, viewerId: userId, likedIds }));
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

/**
 * Deletes the reader's own comment. Row security only lets an author delete
 * their own rows, so a stranger's id deletes nothing. A top-level comment that
 * other readers have replied to is refused here: `parent_id` cascades, and a
 * deletion must never take someone else's words with it.
 */
export async function deleteComment(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data: own } = await supabase
    .from("comments")
    .select("id, report_id, author_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!own || (own as { author_id: string }).author_id !== userId) {
    return { ok: false, error: "Only your own comment can be deleted." };
  }
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", commentId)
    .neq("author_id", userId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Others have replied to this comment, so it stays." };
  }
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("author_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/report/${(own as { report_id: string }).report_id}`);
  return { ok: true };
}
