"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Archive, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { archivePublication } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";

/**
 * Archiving is the closest thing to deleting a publication, and the copy here
 * is the product's honesty about the difference. A creator must not close this
 * believing a locked call went away with it.
 */
export function ArchiveDialog({
  id,
  title,
  hasCall,
}: {
  id: string;
  title: string;
  hasCall: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const res = await archivePublication(id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not archive this publication.");
        return;
      }
      toast.success("Archived. It is off every public surface.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="focus-ring flex items-center gap-1 hover:text-text">
        <Archive size={13} aria-hidden /> Archive
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--ink)]/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-lg md:p-6">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl font-semibold tracking-tight">
              Archive this publication?
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
              <p>
                It comes off the Feed, Explore, search and your public profile. Anyone
                opening a link to it will no longer find it.
              </p>
              <p className="text-text-mute">
                This is not a delete. Stoa cannot delete a published report: the record,
                its text and its timestamp stay exactly as you published them, and the
                archive is written to your audit log.
              </p>
              {hasCall && (
                <p className="rounded-[var(--radius-card)] border border-[var(--brass)]/40 bg-[var(--brass)]/10 p-3">
                  <span className="font-semibold">This publication has a locked call.</span>{" "}
                  The call stays on your track record, keeps counting toward your
                  accuracy, and still resolves on its horizon date. Archiving hides the
                  write-up, not the result.
                </p>
              )}
              <p className="text-text-mute">You can restore it at any time.</p>
            </div>
          </Dialog.Description>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" disabled={pending}>
                Keep it
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={confirm} disabled={pending}>
              {pending ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
