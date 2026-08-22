"use client";

import { DENSITY_STORAGE_KEY, DENSITY_EVENT, parseDensity, type Density } from "@/lib/design/density";
import { useStoredValue } from "@/lib/hooks/use-stored-value";
import { cn } from "@/lib/design/cn";

/**
 * Persists comfortable/compact for dense surfaces only. Reader pages ignore this.
 */
export function DensityToggle() {
  const density = useStoredValue(DENSITY_STORAGE_KEY, parseDensity, "comfortable", DENSITY_EVENT);

  function choose(next: Density) {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    window.dispatchEvent(new Event(DENSITY_EVENT));
  }

  return (
    <fieldset className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <legend className="t-h3 px-1">Density</legend>
      <p className="t-meta mt-1">
        Compact tightens tables and dashboards. Report reading stays editorial either way.
      </p>
      <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Interface density">
        {(["comfortable", "compact"] as Density[]).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={density === option}
            onClick={() => choose(option)}
            className={cn(
              "focus-ring flex-1 rounded-[var(--radius-btn)] border px-3 py-2 text-sm capitalize transition-colors",
              density === option
                ? "border-border-strong bg-surface-2 font-medium text-text"
                : "border-border text-text-mute hover:text-text",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
