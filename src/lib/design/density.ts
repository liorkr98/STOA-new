export type Density = "comfortable" | "compact";

export const DENSITY_STORAGE_KEY = "stoa-density";

/** Same-tab change signal; `storage` only fires in other tabs. */
export const DENSITY_EVENT = "stoa-density";

export function parseDensity(value: string | null | undefined): Density {
  return value === "compact" ? "compact" : "comfortable";
}
