"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/design/cn";

/**
 * The true state of the draft, in words, beside the step's forward button:
 * where a creator is already looking while they work, rather than in the
 * publish row where a Save button read as a publishing action.
 *
 * Four states and nothing else: unsaved changes, saving, saved (and how long
 * ago), or not saved with the reason. It never says "Saved" when the server
 * has not confirmed it, and it never goes quiet: a draft that has never been
 * saved says so.
 */
export function SaveStatus({
  dirty,
  saving,
  savedAt,
  error,
  className,
}: {
  dirty: boolean;
  saving: boolean;
  /** Epoch ms of the last confirmed save, or null when nothing has been saved this session. */
  savedAt: number | null;
  error: string | null;
  className?: string;
}) {
  // A slow clock, so "Saved 3 min ago" stays true without a render per second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!savedAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [savedAt]);

  let text: string;
  let tone: "quiet" | "live" | "bad" = "quiet";
  if (saving) {
    text = "Saving…";
    tone = "live";
  } else if (error) {
    text = `Not saved: ${error}`;
    tone = "bad";
  } else if (dirty) {
    text = "Unsaved changes";
    tone = "live";
  } else if (savedAt) {
    const minutes = Math.max(0, Math.floor((Math.max(now, savedAt) - savedAt) / 60_000));
    text = minutes < 1 ? "Saved just now" : minutes < 60 ? `Saved ${minutes} min ago` : "Saved over an hour ago";
  } else {
    text = "Nothing to save yet";
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "num min-w-0 truncate text-[10px] uppercase tracking-[0.14em]",
        tone === "bad" ? "text-[var(--rust)]" : tone === "live" ? "text-text" : "text-text-faint",
        className,
      )}
      title={error ?? undefined}
    >
      {text}
    </p>
  );
}
