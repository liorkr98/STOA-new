"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CardPreview } from "@/components/compose/card-preview";
import type { DraftCard } from "@/lib/compose/cards";
import { FEED_PREVIEW_LONG_SECONDS } from "@/lib/compose/modes";
import { fmtTimecode } from "@/lib/compose/overlays";

export function PublishPreviewDialog({
  open,
  onOpenChange,
  title,
  dek,
  cards,
  clipSeconds,
  feedPreviewSeconds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  dek: string;
  cards: DraftCard[];
  clipSeconds: number | null;
  feedPreviewSeconds: number | null;
}) {
  const body = cards.filter((c) => c.kind !== "unlock");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="scroll-area fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-paper p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-[1.375rem] font-semibold tracking-tight">
                Preview
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[0.8125rem] leading-snug text-text-mute">
                How this reads before you publish. The Feed may show a shorter clip.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="focus-ring rounded-[4px] p-1 text-text-mute hover:text-text">
              <X size={18} />
            </Dialog.Close>
          </div>

          <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-text">
            {title.trim() || "Headline"}
          </p>
          {dek.trim() ? <p className="mt-2 text-[0.9375rem] leading-snug text-text-mute">{dek}</p> : null}

          {clipSeconds != null && clipSeconds > 0 ? (
            <p className="mt-4 text-[0.8125rem] leading-snug text-text-mute">
              {feedPreviewSeconds
                ? `This clip is ${fmtTimecode(clipSeconds)}. The Feed plays the first ${FEED_PREVIEW_LONG_SECONDS} seconds. The full video is on Explore and your profile.`
                : `This clip is ${fmtTimecode(clipSeconds)}. The Feed will play it in full.`}
            </p>
          ) : null}

          {body.length > 0 ? (
            <div className="mt-5 space-y-3">
              {body.map((c) => (
                <CardPreview key={c.id} card={c} compact />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-[0.8125rem] text-text-faint">No cards yet.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
