"use client";

import { DENSITY_STORAGE_KEY, DENSITY_EVENT, parseDensity } from "@/lib/design/density";
import { useStoredValue } from "@/lib/hooks/use-stored-value";

/**
 * Applies data-density on dense surfaces (dashboards, watchlists, screeners).
 * Reader/editorial pages never wrap with this. Preference is localStorage.
 */
export function DensityRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const density = useStoredValue(DENSITY_STORAGE_KEY, parseDensity, "comfortable", DENSITY_EVENT);

  return (
    <div data-density={density} className={className}>
      {children}
    </div>
  );
}
