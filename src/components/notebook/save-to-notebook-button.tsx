"use client";

import { useState, useTransition } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { saveToNotebookAction } from "@/app/actions/notebooks";
import type { EntryInput } from "@/lib/db/notebooks";

/**
 * "Save to Notebook" (Part F capture). The one primitive wired onto every
 * capture surface: report reader selections, data blocks, transcript lines, and
 * Copilot answers. Drops the entry into the reader's default "Saved" notebook
 * (created on first use). Owner-private; a logged-out reader is prompted to sign in.
 */
export function SaveToNotebookButton({
  entry,
  label = "Save to Notebook",
  className,
  compact = false,
}: {
  entry: EntryInput;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "saved" | "auth">("idle");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const result = await saveToNotebookAction(entry);
      setState(result ? "saved" : "auth");
    });
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={pending || state === "saved"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] text-[11px] text-text-mute transition-colors hover:text-text focus-ring disabled:opacity-70",
        !compact && "border border-border bg-surface px-2 py-1",
        className,
      )}
    >
      {state === "saved" ? <Check size={13} /> : <BookmarkPlus size={13} />}
      {state === "saved" ? "Saved" : state === "auth" ? "Sign in to save" : label}
    </button>
  );
}
