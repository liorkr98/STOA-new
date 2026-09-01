"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deletePublication } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";

const CONFIRM_WORD = "DELETE";

/**
 * Deleting a publication for good.
 *
 * This sits one row away from Archive, which is recoverable, and the two must
 * never be confused for one another. So this dialog does not reuse the archive
 * copy with a harder verb: it says what is destroyed, says that Archive is the
 * reversible option, and asks the creator to type the word before the button
 * turns on. Only a publication with no call ever reaches here.
 */
export function DeleteDialog({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const armed = typed.trim().toUpperCase() === CONFIRM_WORD;

  function confirm() {
    if (!armed) return;
    startTransition(async () => {
      const res = await deletePublication(id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not delete this publication.");
        return;
      }
      toast.success("Deleted. It is gone for good.");
      setOpen(false);
      setTyped("");
      router.refresh();
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTyped("");
      }}
    >
      <Dialog.Trigger className="focus-ring flex items-center gap-1 hover:text-[var(--rust)]">
        <Trash2 size={13} aria-hidden /> Delete
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--ink)]/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-lg md:p-6">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl font-semibold tracking-tight">
              Delete this publication for good?
            </Dialog.Title>
            <Dialog.Close className="focus-ring rounded p-1 text-text-mute hover:text-text">
              <X size={16} aria-hidden />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <p dir="auto" className="user-copy mt-2 truncate text-sm text-text-mute">
            {title}
          </p>

          <Dialog.Description asChild>
            <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-text">
              <p className="rounded-[var(--radius-card)] border border-[var(--rust)]/40 bg-[var(--rust)]/10 p-3">
                <span className="font-semibold">This cannot be undone.</span> The text, the
                video, the cards and the tags are destroyed. Existing links stop working, and
                Stoa cannot bring any of it back.
              </p>
              <p className="text-text-mute">
                Archive is the reversible one: it takes the publication off every public
                surface and keeps it, so you can restore it whenever you like. If you are not
                certain, archive instead.
              </p>
              <p className="text-text-mute">
                This publication carries no call, which is the only reason deleting it is
                offered at all.
              </p>
            </div>
          </Dialog.Description>

          <label htmlFor={`confirm-delete-${id}`} className="mt-4 block text-[13px] text-text">
            Type <span className="num font-semibold">{CONFIRM_WORD}</span> to confirm.
          </label>
          <input
            id={`confirm-delete-${id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="focus-ring mt-1.5 w-full rounded-[var(--radius-btn)] border border-border bg-paper px-3 py-2 text-sm text-text placeholder:text-text-faint"
            placeholder={CONFIRM_WORD}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" disabled={pending}>
                Keep it
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={confirm} disabled={pending || !armed}>
              {pending ? "Deleting..." : "Delete for good"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
