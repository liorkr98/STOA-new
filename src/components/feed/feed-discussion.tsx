"use client";

import { useMemo, useState, useTransition } from "react";
import { Heart, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/design/cn";
import { sinceLabel } from "@/lib/today/format";
import type { FeedComment } from "@/lib/feed/types";

/**
 * Discussions as a real discussion: each comment can be replied to, one
 * level of nesting only. Replies indent beneath their parent; a reply to a
 * reply is flattened into the same level with an @mention, because deep
 * indentation breaks on mobile. The analyst's own comments carry a small
 * AUTHOR tag. Sort newest by default, or most-liked. No score, no follower
 * count anywhere.
 *
 * COMMENTS_PLACEHOLDER: the comments table has no parent_id, so live threads
 * arrive flat and a reply posts as a top-level comment mentioning the person.
 */
export function FeedDiscussion({
  comments,
  onPost,
  canPost,
  className,
}: {
  comments: FeedComment[];
  /** Posts a comment (or a reply; parentId is null until the table carries it). */
  onPost?: (text: string, parentId: string | null) => Promise<void>;
  canPost: boolean;
  className?: string;
}) {
  const [sort, setSort] = useState<"newest" | "liked">("newest");
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  const threads = useMemo(() => {
    const top = comments.filter((c) => !c.parentId);
    const byParent = new Map<string, FeedComment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      // One level only: a reply whose parent is itself a reply attaches to the root.
      let rootId = c.parentId;
      const parent = comments.find((x) => x.id === c.parentId);
      if (parent?.parentId) rootId = parent.parentId;
      byParent.set(rootId, [...(byParent.get(rootId) ?? []), c]);
    }
    const sorter = (a: FeedComment, b: FeedComment) =>
      sort === "liked" ? b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return top.sort(sorter).map((c) => ({
      root: c,
      replies: (byParent.get(c.id) ?? []).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    }));
  }, [comments, sort]);

  const submit = () => {
    const body = text.trim();
    if (!body || !onPost) return;
    const withMention = replyTo && replyTo.parentId ? `@${replyTo.author.displayName} ${body}` : body;
    start(async () => {
      await onPost(withMention, replyTo ? (replyTo.parentId ?? replyTo.id) : null);
      setText("");
      setReplyTo(null);
    });
  };

  const Row = ({ c, reply }: { c: FeedComment; reply?: boolean }) => (
    <article className={cn("flex gap-3", reply && "ml-9")}>
      <Avatar src={c.author.avatarUrl} name={c.author.displayName} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[0.8125rem] font-semibold text-text">{c.author.displayName}</span>
          {c.author.isAuthor ? <span className="num rounded-[var(--radius-tag)] border border-[var(--ink)] px-1 text-[9px] uppercase tracking-[0.14em] text-text">Author</span> : null}
          <span className="num text-[10px] uppercase tracking-[0.1em] text-text-faint">{sinceLabel(c.createdAt)}</span>
        </div>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-text">
          {c.replyingTo ? <span className="text-text-mute">@{c.replyingTo} </span> : null}
          {c.text}
        </p>
        <div className="mt-1.5 flex items-center gap-4">
          <span className="num inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-text-faint">
            <Heart size={11} strokeWidth={1.6} aria-hidden /> {c.likes}
          </span>
          {canPost ? (
            <button
              type="button"
              onClick={() => setReplyTo(c)}
              className="num focus-ring inline-flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.1em] text-text-mute hover:text-text"
            >
              <MessageSquare size={11} strokeWidth={1.6} aria-hidden /> Reply
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );

  return (
    <section aria-label="Discussion" className={cn("mt-8", className)}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">
          Discussion · {comments.length}
        </h3>
        <div className="flex items-center gap-3" role="radiogroup" aria-label="Sort">
          {(["newest", "liked"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={sort === k}
              onClick={() => setSort(k)}
              className={cn("num focus-ring rounded text-[10px] uppercase tracking-[0.14em]", sort === k ? "text-text" : "text-text-faint hover:text-text")}
            >
              {k === "newest" ? "Newest" : "Most liked"}
            </button>
          ))}
        </div>
      </div>

      {canPost ? (
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={replyTo ? "Write a reply" : "Ask the analyst, or add to the discussion"}
              className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-sm text-text focus-ring"
            />
            <button
              type="button"
              disabled={pending || !text.trim()}
              onClick={submit}
              className="focus-ring rounded-[var(--radius-btn)] bg-[var(--ink)] px-3 py-2 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-5">
        {threads.length === 0 ? <p className="text-sm text-text-mute">No comments yet.</p> : null}
        {threads.map(({ root, replies }) => (
          <div key={root.id} className="flex flex-col gap-4">
            <Row c={root} />
            {replies.map((r) => (
              <Row key={r.id} c={r} reply />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
