"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CardPreview } from "@/components/compose/card-preview";
import type { DraftCard } from "@/lib/compose/cards";

export function PublishPreviewDialog({
  open,
  onOpenChange,
  title,
  dek,
  cards,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  dek: string;
  cards: DraftCard[];
}) {
  const body = cards.filter((c) => c.kind !== "unlock");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="scroll-area fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-paper p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-[1.375rem] font-semibold tracking-tight">
              Preview
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="focus-ring rounded-[4px] p-1 text-text-mute hover:text-text">
              <X size={18} />
            </Dialog.Close>
          </div>

          <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-text">
            {title.trim() || "Headline"}
          </p>
          {dek.trim() ? <p className="mt-2 text-[0.9375rem] leading-snug text-text-mute">{dek}</p> : null}

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
