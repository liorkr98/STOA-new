"use client";

import { useState } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Privacy toggle placeholder. There is no backend field for this yet, so it is
 * local-only and not persisted -- flagged as a data gap for the profile brief.
 */
export function PrivacyToggle({
  label,
  defaultOn = false,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors focus-ring",
          on ? "border-[var(--ink)] bg-[var(--ink)]" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-[var(--paper)] transition-transform",
            on ? "left-0.5 translate-x-4" : "left-0.5",
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </label>
  );
}
