"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

/**
 * A link pressed with unsaved work. Three honest choices and a default that
 * loses nothing: save and go, go without saving, or stay. Shown for the app's
 * own links; the browser's own prompt covers reloads and closed tabs.
 */
export function LeaveDialog({
  href,
  published,
  saving,
  onStay,
  onLeave,
  onSaveAndLeave,
}: {
  /** Where the creator was going; null keeps the dialog closed. */
  href: string | null;
  /** Editing a live publication: saving files a public edit marker. */
  published: boolean;
  saving: boolean;
  onStay: () => void;
  onLeave: () => void;
  onSaveAndLeave: () => void;
}) {
  return (
    <Dialog.Root open={href !== null} onOpenChange={(o) => !o && onStay()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-lg md:p-6">
          <Dialog.Title className="font-display text-xl font-semibold tracking-tight">
            Leave with unsaved changes?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] leading-relaxed text-text-mute">
            {published
              ? "Your latest edits to this publication have not been saved. Saving files an EDITED marker on it, as any edit does."
              : "Your latest changes have not been saved to the draft yet."}
          </Dialog.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onLeave} disabled={saving} className="text-[var(--rust)]">
              Leave without saving
            </Button>
            <Button variant="secondary" size="sm" onClick={onStay} disabled={saving}>
              Stay
            </Button>
            <Button size="sm" onClick={onSaveAndLeave} disabled={saving}>
              {saving ? "Saving…" : published ? "Save changes and leave" : "Save and leave"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
