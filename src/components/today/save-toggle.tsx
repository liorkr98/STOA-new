"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleSave } from "@/app/actions/social";
import { cn } from "@/lib/design/cn";

/**
 * The bookmark that sits on every Today row. Optimistic, quiet at rest, and
 * filled once saved -- the only affordance a headline row carries besides the
 * headline link itself.
 */
export function SaveToggle({
  reportId,
  initialSaved,
  className,
}: {
  reportId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [, start] = useTransition();

  function onSave() {
    const prev = saved;
    setSaved(!prev);
    start(async () => {
      try {
        const res = await toggleSave(reportId);
        setSaved(res.saved);
      } catch {
        setSaved(prev);
        toast.error("Could not update save. Try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onSave}
      aria-pressed={saved}
      aria-label={saved ? "Remove from library" : "Save to library"}
      title={saved ? "Saved" : "Save"}
      className={cn(
        "tap-target focus-ring inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors duration-[var(--dur-1)] hover:text-text",
        saved && "text-text",
        className,
      )}
    >
      <Bookmark size={14} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
