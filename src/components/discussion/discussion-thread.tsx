"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Heart, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteComment, toggleCommentLike } from "@/app/actions/feed";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { sinceLabel } from "@/lib/today/format";
import type { FeedComment } from "@/lib/feed/types";

/**
 * The one discussion, wherever a publication is discussed: the Feed's panel
 * and the publication page render this and nothing else, so a reader gets the
 * same controls in both places. Each comment can be replied to (one level, the
 * database rejects deeper), liked, and deleted by the person who wrote it. The
 * analyst's own comments carry a small AUTHOR tag. Sort newest or most liked.
 * No score, no follower count anywhere.
 *
 * Likes and deletions apply locally at once and are confirmed by the server;
 * a refusal puts the row back and says why. Comments that arrive from the
 * server after a refresh replace the local picture, so nothing is shown twice.
 */
export interface DiscussionActions {
  /** Posts a comment, or a one-level reply when parentId is a top-level comment. */
  post: (text: string, parentId: string | null) => Promise<FeedComment | null>;
  toggleLike: (commentId: string, liked: boolean) => Promise<{ ok: boolean; liked: boolean }>;
  remove: (commentId: string) => Promise<{ ok: boolean; error?: string }>;
}

const serverActions: Omit<DiscussionActions, "post"> = {
  toggleLike: toggleCommentLike,
  remove: deleteComment,
};

export function DiscussionThread({
  comments,
  canPost,
  actions,
  variant = "page",
  className,
}: {
  comments: FeedComment[];
  /** Signed in. When false the composer becomes a sign-in line and likes are read-only. */
  canPost: boolean;
  /** `post` is supplied by the surface; like and delete default to the server actions. */
  actions?: Partial<DiscussionActions>;
  /** `page` sits under a publication; `panel` is the Feed's overlay and needs no heading rule. */
  variant?: "page" | "panel";
  className?: string;
}) {
  const [sort, setSort] = useState<"newest" | "liked">("newest");
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [posted, setPosted] = useState<FeedComment[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [likeState, setLikeState] = useState<Map<string, { liked: boolean; likes: number }>>(() => new Map());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const toggleLike = actions?.toggleLike ?? serverActions.toggleLike;
  const remove = actions?.remove ?? serverActions.remove;
  const post = actions?.post;

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const all: FeedComment[] = [];
    for (const c of [...posted, ...comments]) {
      if (seen.has(c.id) || removed.has(c.id)) continue;
      seen.add(c.id);
      const like = likeState.get(c.id);
      all.push(like ? { ...c, likedByMe: like.liked, likes: like.likes } : c);
    }
    return all;
  }, [posted, comments, removed, likeState]);

  const threads = useMemo(() => {
    const top = merged.filter((c) => !c.parentId);
    const byParent = new Map<string, FeedComment[]>();
    for (const c of merged) {
      if (!c.parentId) continue;
      // One level only: a reply whose parent is itself a reply attaches to the root.
      let rootId = c.parentId;
      const parent = merged.find((x) => x.id === c.parentId);
      if (parent?.parentId) rootId = parent.parentId;
      byParent.set(rootId, [...(byParent.get(rootId) ?? []), c]);
    }
    const sorter = (a: FeedComment, b: FeedComment) =>
      sort === "liked"
        ? b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt)
        : Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return top.sort(sorter).map((c) => ({
      root: c,
      replies: (byParent.get(c.id) ?? []).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    }));
  }, [merged, sort]);

  const submit = () => {
    const body = text.trim();
    if (!body || !post) return;
    const withMention = replyTo && replyTo.parentId ? `@${replyTo.author.displayName} ${body}` : body;
    start(async () => {
      const created = await post(withMention, replyTo ? (replyTo.parentId ?? replyTo.id) : null);
      if (!created) {
        toast.error("The comment did not post. Try again.");
        return;
      }
      setPosted((p) => [{ ...created, mine: true }, ...p]);
      setText("");
      setReplyTo(null);
    });
  };

  const onLike = (c: FeedComment) => {
    if (!canPost) return;
    const before = { liked: Boolean(c.likedByMe), likes: c.likes };
    const after = { liked: !before.liked, likes: Math.max(0, before.likes + (before.liked ? -1 : 1)) };
    setLikeState((m) => new Map(m).set(c.id, after));
    void toggleLike(c.id, before.liked).then((res) => {
      if (res.ok && res.liked === after.liked) return;
      setLikeState((m) => new Map(m).set(c.id, before));
      toast.error("That like did not stick. Try again.");
    });
  };

  const onDelete = (c: FeedComment) => {
    setConfirmDelete(null);
    setRemoved((s) => new Set(s).add(c.id));
    void remove(c.id).then((res) => {
      if (res.ok) return;
      setRemoved((s) => {
        const next = new Set(s);
        next.delete(c.id);
        return next;
      });
      toast.error(res.error ?? "The comment could not be deleted.");
    });
  };

  const Row = ({ c, reply, hasOthersReplies }: { c: FeedComment; reply?: boolean; hasOthersReplies?: boolean }) => {
    const liked = Boolean(c.likedByMe);
    const confirming = confirmDelete === c.id;
    return (
      <article className={cn("flex gap-3", reply && "ml-9")}>
        <Avatar src={c.author.avatarUrl} name={c.author.displayName} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span dir="auto" className="user-copy text-[0.8125rem] font-semibold text-text">
              {c.author.displayName}
            </span>
            {c.author.isAuthor ? (
              <span className="num rounded-[var(--radius-tag)] border border-[var(--ink)] px-1 text-[10px] uppercase tracking-[0.14em] text-text">
                Author
              </span>
            ) : null}
            <span className="num text-[10px] uppercase tracking-[0.1em] text-text-faint">{sinceLabel(c.createdAt)}</span>
          </div>
          <p dir="auto" className="user-copy mt-1 text-[0.9375rem] leading-relaxed text-text">
            {c.replyingTo ? <span className="text-text-mute">@{c.replyingTo} </span> : null}
            {c.text}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-4">
            {canPost ? (
              <button
                type="button"
                aria-pressed={liked}
                aria-label={liked ? "Unlike" : "Like"}
                onClick={() => onLike(c)}
                className={cn(
                  "num focus-ring inline-flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.1em]",
                  liked ? "text-text" : "text-text-mute hover:text-text",
                )}
              >
                <Heart size={11} strokeWidth={1.6} aria-hidden fill={liked ? "currentColor" : "none"} /> {c.likes}
              </button>
            ) : (
              <span className="num inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-text-faint">
                <Heart size={11} strokeWidth={1.6} aria-hidden /> {c.likes}
              </span>
            )}
            {canPost && post ? (
              <button
                type="button"
                onClick={() => setReplyTo(c)}
                className="num focus-ring inline-flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.1em] text-text-mute hover:text-text"
              >
                <MessageSquare size={11} strokeWidth={1.6} aria-hidden /> Reply
              </button>
            ) : null}
            {canPost && c.mine ? (
              confirming ? (
                <span className="num inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-text-mute">
                  Delete this comment?
                  <button
                    type="button"
                    onClick={() => onDelete(c)}
                    className="focus-ring rounded font-semibold text-[var(--rust)] underline"
                  >
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className="focus-ring rounded underline">
                    Keep
                  </button>
                </span>
              ) : hasOthersReplies ? (
                <span
                  className="num inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-text-faint"
                  title="Others have replied, so this comment stays."
                >
                  <Trash2 size={11} strokeWidth={1.6} aria-hidden /> Has replies
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(c.id)}
                  className="num focus-ring inline-flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.1em] text-text-mute hover:text-[var(--rust)]"
                >
                  <Trash2 size={11} strokeWidth={1.6} aria-hidden /> Delete
                </button>
              )
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section aria-label="Discussion" className={cn(variant === "page" ? "mt-10" : "mt-8", className)}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">Discussion · {merged.length}</h3>
        <div className="flex items-center gap-3" role="radiogroup" aria-label="Sort">
          {(["newest", "liked"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={sort === k}
              onClick={() => setSort(k)}
              className={cn(
                "num focus-ring rounded text-[10px] uppercase tracking-[0.14em]",
                sort === k ? "text-text" : "text-text-faint hover:text-text",
              )}
            >
              {k === "newest" ? "Newest" : "Most liked"}
            </button>
          ))}
        </div>
      </div>

      {canPost && post ? (
        <div className="mt-4">
          {replyTo ? (
            <div className="num mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-text-mute">
              Replying to {replyTo.author.displayName}
              <button type="button" onClick={() => setReplyTo(null)} className="focus-ring rounded underline">
                cancel
              </button>
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              dir="auto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={replyTo ? "Write a reply" : "Ask the analyst, or add to the discussion"}
              className="user-copy min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-sm text-text focus-ring"
            />
            <button type="button" disabled={pending || !text.trim()} onClick={submit} className={buttonClass("primary", "sm")}>
              {pending ? "Posting" : "Post"}
            </button>
          </div>
        </div>
      ) : !canPost ? (
        <p className="t-meta mt-4">
          <Link href="/sign-in" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-5">
        {threads.length === 0 ? <p className="text-sm text-text-mute">No comments yet.</p> : null}
        {threads.map(({ root, replies }) => (
          <div key={root.id} className="flex flex-col gap-4">
            <Row c={root} hasOthersReplies={replies.some((r) => !r.mine)} />
            {replies.map((r) => (
              <Row key={r.id} c={r} reply />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
