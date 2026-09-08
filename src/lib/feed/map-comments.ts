import type { Comment } from "@/lib/types";
import type { FeedComment } from "@/lib/feed/types";

/** Maps stored comments into the Feed discussion shape. */
export function toFeedComments(
  comments: Comment[],
  authorHandle: string,
  likedIds: Set<string> = new Set(),
): FeedComment[] {
  return comments.map((c) => ({
    id: c.id,
    parentId: c.parent_id ?? null,
    author: {
      handle: c.author?.handle ?? "",
      displayName: c.author?.display_name ?? "Reader",
      avatarUrl: c.author?.avatar_url ?? null,
      isAuthor: c.author?.handle === authorHandle,
    },
    createdAt: c.created_at,
    text: c.body,
    likes: c.likes ?? 0,
    liked: likedIds.has(c.id),
  }));
}
