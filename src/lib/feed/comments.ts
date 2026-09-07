import type { FeedComment } from "@/lib/feed/types";
import type { Comment } from "@/lib/types";

/**
 * One comment row to the shape every discussion renders. The Feed and the
 * publication page used to each map this by hand, and disagreed on how the
 * AUTHOR tag was decided (handle on one, id on the other). The author is the
 * publication's author by id; the viewer owns a comment by id too.
 */
export function toFeedComment(
  c: Comment,
  ctx: { reportAuthorId: string | null; viewerId: string | null; likedIds?: ReadonlySet<string> },
): FeedComment {
  return {
    id: c.id,
    parentId: c.parent_id ?? null,
    author: {
      handle: c.author?.handle ?? "",
      displayName: c.author?.display_name ?? "Reader",
      avatarUrl: c.author?.avatar_url ?? null,
      isAuthor: Boolean(ctx.reportAuthorId) && c.author_id === ctx.reportAuthorId,
    },
    createdAt: c.created_at,
    text: c.body,
    likes: c.likes ?? 0,
    mine: Boolean(ctx.viewerId) && c.author_id === ctx.viewerId,
    likedByMe: ctx.likedIds?.has(c.id) ?? false,
  };
}
