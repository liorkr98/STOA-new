export type CapBand = "mega" | "large" | "mid" | "small";

/** USD thresholds for cap bands (aligned with product copy). */
export const CAP_BAND_THRESHOLDS = {
  mega: 200_000_000_000,
  large: 10_000_000_000,
  mid: 2_000_000_000,
} as const;

export function capBandFromMarketCap(marketCap: number | null | undefined): CapBand | null {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) return null;
  if (marketCap >= CAP_BAND_THRESHOLDS.mega) return "mega";
  if (marketCap >= CAP_BAND_THRESHOLDS.large) return "large";
  if (marketCap >= CAP_BAND_THRESHOLDS.mid) return "mid";
  return "small";
}

export function capBandLabel(band: CapBand): string {
  switch (band) {
    case "mega":
      return "Mega cap";
    case "large":
      return "Large cap";
    case "mid":
      return "Mid cap";
    case "small":
      return "Small cap";
  }
}
