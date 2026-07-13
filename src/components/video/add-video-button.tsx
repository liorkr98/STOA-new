"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { AddVideoFlow } from "@/components/video/add-video-flow";

/**
 * "Add video" entry point (Part 3.1). Only shown on locked/published reports the
 * analyst owns -- the schema-level hard link (report_id NOT NULL) is enforced by
 * the upload route; this button just opens the focused creation flow.
 */
export function AddVideoButton({
  reportId,
  reportTitle,
  disclosure,
  className,
  label = "Add video",
}: {
  reportId: string;
  reportTitle: string;
  disclosure: { positionHeld: boolean | null; compensationTied: boolean | null };
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-2",
          className,
        )}
      >
        <Video size={13} aria-hidden />
        {label}
      </button>
      {open && (
        <AddVideoFlow
          reportId={reportId}
          reportTitle={reportTitle}
          disclosure={disclosure}
          onClose={() => setOpen(false)}
          onPublished={() => setOpen(false)}
        />
      )}
    </>
  );
}
