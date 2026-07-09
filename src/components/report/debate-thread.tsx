"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/design/cn";
import { Avatar } from "@/components/ui/avatar";
import { TrackScoreBadge } from "@/components/ui/track-score-badge";
import { Button } from "@/components/ui/button";
import type { Comment } from "@/lib/types";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/**
 * Scoped comment thread on a single opinion claim -- not a general comment
 * section (that's CommentsSection). Mobile: a Vaul drawer (gesture-driven,
 * spring-based, drag-to-dismiss, per docs/MOTION.md A.3). Desktop: a Radix
 * side panel that drifts in 8px with a fade -- not a full-width slide.
 *
 * Replies aren't persisted yet -- debate_threads/debate_replies don't exist
 * in the schema (see BACKEND_DATA_CONTRACTS.md). onReply is called
 * optimistically; wire it to a real server action once that table lands.
 */
export function DebateThread({
  open,
  onOpenChange,
  claimText,
  replies,
  onReply,
  isAuthed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimText: string;
  replies: Comment[];
  onReply: (body: string) => void | Promise<void>;
  isAuthed: boolean;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-[var(--r-card)] border-t border-border bg-paper focus:outline-none"
            aria-describedby={undefined}
          >
            <div
              aria-hidden
              className="mx-auto mt-2.5 h-1 w-9 rounded-[var(--radius-tag)] bg-border-strong"
            />
            <ThreadBody
              claimText={claimText}
              replies={replies}
              onReply={onReply}
              isAuthed={isAuthed}
              Title={Drawer.Title}
              Description={Drawer.Description}
              Close={Drawer.Close}
            />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[fade-in_var(--dur-3)_var(--ease-out)] data-[state=closed]:animate-[fade-out_var(--dur-2)_var(--ease-out)]" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-96 flex-col border-l border-border bg-paper focus:outline-none",
            "data-[state=open]:animate-[panel-in-x_var(--dur-3)_var(--ease-out)]",
            "data-[state=closed]:animate-[panel-out-x_var(--dur-2)_var(--ease-out)]",
          )}
        >
          <ThreadBody
            claimText={claimText}
            replies={replies}
            onReply={onReply}
            isAuthed={isAuthed}
            Title={Dialog.Title}
            Description={Dialog.Description}
            Close={Dialog.Close}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ThreadBody({
  claimText,
  replies,
  onReply,
  isAuthed,
  Title,
  Description,
  Close,
}: {
  claimText: string;
  replies: Comment[];
  onReply: (body: string) => void | Promise<void>;
  isAuthed: boolean;
  Title: typeof Dialog.Title;
  Description: typeof Dialog.Description;
  Close: typeof Dialog.Close;
}) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setPending(true);
    await onReply(text);
    setPending(false);
    setBody("");
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <Title className="t-eyebrow flex items-center gap-1.5">
            <MessageCircle size={13} className="fill-current" />
            Debate
          </Title>
          <Description className="t-body-editorial mt-1 text-sm italic">
            &ldquo;{claimText}&rdquo;
          </Description>
        </div>
        <Close asChild>
          <button
            className="tap-target shrink-0 text-text-faint transition-colors hover:text-text focus-ring rounded-[var(--r-tag)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </Close>
      </div>

      <div className="scroll-area flex-1 overflow-y-auto p-4">
        {replies.length === 0 ? (
          <p className="t-meta py-6 text-center">
            No replies yet. Be the first to weigh in on this claim.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {replies.map((r) => (
              <li key={r.id} className="flex gap-2.5">
                <Avatar src={r.author?.avatar_url} name={r.author?.display_name ?? "User"} size="sm" />
                <div className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-semibold">{r.author?.display_name ?? "User"}</span>
                    {r.author?.role === "analyst" && r.author.score != null && (
                      <TrackScoreBadge handle={r.author.handle} score={r.author.score} size="sm" />
                    )}
                    <span className="t-meta">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </span>
                  <p className="text-sm text-text">{r.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-4">
        {isAuthed ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Reply..."
              className="w-full resize-none rounded-[var(--r-btn)] border border-border bg-surface p-2.5 text-sm focus-ring"
            />
            <Button size="sm" className="self-end" disabled={pending || !body.trim()} onClick={submit}>
              {pending ? "Posting..." : "Reply"}
            </Button>
          </div>
        ) : (
          <p className="t-meta">Sign in to join the debate.</p>
        )}
      </div>
    </>
  );
}
