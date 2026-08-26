"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/**
 * YouTube-style details step: write first, then answer tags, access, and the
 * call before the publication actually goes live.
 */
export function PublishDetailsDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="scroll-area fixed inset-y-0 right-0 z-50 flex w-[min(100vw,420px)] flex-col overflow-y-auto border-l border-border bg-paper p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-[1.375rem] font-semibold tracking-tight">
                Before you publish
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[0.8125rem] leading-snug text-text-mute">
                Tags, who can read it, and an optional locked call. Same idea as filling in the details after an upload.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="focus-ring rounded-[4px] p-1 text-text-mute hover:text-text"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
