"use client";

import { useEffect, useState } from "react";
import { DENSITY_STORAGE_KEY, parseDensity, type Density } from "@/lib/design/density";

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
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    setDensity(parseDensity(window.localStorage.getItem(DENSITY_STORAGE_KEY)));
    function onStorage(e: StorageEvent) {
      if (e.key === DENSITY_STORAGE_KEY) setDensity(parseDensity(e.newValue));
    }
    function onCustom() {
      setDensity(parseDensity(window.localStorage.getItem(DENSITY_STORAGE_KEY)));
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("stoa-density", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("stoa-density", onCustom);
    };
  }, []);

  return (
    <div data-density={density} className={className}>
      {children}
    </div>
  );
}
