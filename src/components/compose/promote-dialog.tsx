"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Megaphone } from "lucide-react";
import { PromotePanel } from "@/components/compose/promote-panel";
import { EMPTY_PROMOTE, type PromoteState } from "@/lib/compose/promote";

/**
 * Promote, reached from a publication that is already out.
 *
 * Promotion is not a property of composing, it is a property of the
 * publication, so the same panel has to be reachable after publish and not
 * only before it. Same component, same rules, same missing price.
 */
export function PromoteDialog({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PromoteState>(EMPTY_PROMOTE);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="flex items-center gap-1 hover:text-text focus-ring rounded">
        <Megaphone size={13} /> Promote
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="scroll-area fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(94vw,460px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-paper p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-[1.25rem] font-semibold tracking-tight">
                Promote
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 truncate text-[0.8125rem] text-text-mute">
                {title}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="focus-ring rounded-[4px] p-1 text-text-mute hover:text-text">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="mt-4">
            <PromotePanel state={state} onChange={setState} published />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
