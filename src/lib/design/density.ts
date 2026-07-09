export type Density = "comfortable" | "compact";

export const DENSITY_STORAGE_KEY = "stoa-density";

export function parseDensity(value: string | null | undefined): Density {
  return value === "compact" ? "compact" : "comfortable";
}
