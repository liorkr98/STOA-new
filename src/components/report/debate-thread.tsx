"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChatCircle } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/design/cn";
import { Avatar } from "@/components/ui/avatar";
import { MoatBadge } from "@/components/ui/moat-badge";
import { Button } from "@/components/ui/button";
import type { Comment } from "@/lib/types";

/**
 * Scoped comment thread on a single opinion claim -- not a general comment
 * section (that's CommentsSection). Side panel on desktop, bottom sheet on
 * mobile, both built on the same Radix Dialog so focus-trap/Escape/overlay
 * behavior stays consistent with the rest of the product.
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[fade-in_150ms_ease-out] data-[state=closed]:animate-[fade-out_150ms_ease-in]" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-paper focus:outline-none",
            // Mobile: bottom sheet. Desktop (sm+): right-anchored side panel.
            "inset-x-0 bottom-0 max-h-[80vh] rounded-t-[var(--r-card)] border-t border-border",
            "sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:max-h-none sm:w-96 sm:rounded-none sm:border-l sm:border-t-0",
            "data-[state=open]:animate-[sheet-in-y_250ms_cubic-bezier(0.32,0.72,0,1)]",
            "data-[state=closed]:animate-[sheet-out-y_200ms_ease-in]",
            "sm:data-[state=open]:animate-[sheet-in-x_250ms_cubic-bezier(0.32,0.72,0,1)]",
            "sm:data-[state=closed]:animate-[sheet-out-x_200ms_ease-in]",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border p-4">
            <div>
              <Dialog.Title className="t-eyebrow flex items-center gap-1.5">
                <ChatCircle size={13} weight="fill" />
                Debate
              </Dialog.Title>
              <Dialog.Description className="t-body-editorial mt-1 text-sm italic">
                &ldquo;{claimText}&rdquo;
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="shrink-0 text-text-faint transition-colors hover:text-text focus-ring rounded-[var(--r-tag)]" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="scroll-area flex-1 overflow-y-auto p-4">
            {replies.length === 0 ? (
              <p className="t-meta py-6 text-center">No replies yet. Be the first to weigh in on this claim.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {replies.map((r) => (
                  <li key={r.id} className="flex gap-2.5">
                    <Avatar src={r.author?.avatar_url} name={r.author?.display_name ?? "User"} size="sm" />
                    <div className="flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="font-semibold">{r.author?.display_name ?? "User"}</span>
                        {r.author?.role === "analyst" && r.author.score != null && (
                          <MoatBadge handle={r.author.handle} score={r.author.score} size="sm" />
                        )}
                        <span className="t-meta">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
