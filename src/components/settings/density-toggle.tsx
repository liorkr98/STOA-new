"use client";

import { useEffect, useState } from "react";
import { DENSITY_STORAGE_KEY, parseDensity, type Density } from "@/lib/design/density";
import { cn } from "@/lib/design/cn";

/**
 * Persists comfortable/compact for dense surfaces only. Reader pages ignore this.
 */
export function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    setDensity(parseDensity(window.localStorage.getItem(DENSITY_STORAGE_KEY)));
  }, []);

  function choose(next: Density) {
    setDensity(next);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    window.dispatchEvent(new Event("stoa-density"));
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
