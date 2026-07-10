import { UNIVERSE, type CapBand, type UniverseEntry } from "@/lib/universe";

export type { CapBand };

const BAND_BY_TICKER: Record<string, CapBand> = Object.fromEntries(
  UNIVERSE.map((u) => [u.ticker, u.capBand]),
) as Record<string, CapBand>;

export function capBandForTicker(ticker: string | null | undefined): CapBand | null {
  if (!ticker) return null;
  return BAND_BY_TICKER[ticker.toUpperCase()] ?? null;
}

export function tickerMatchesCapBand(
  ticker: string | null | undefined,
  band: CapBand,
): boolean {
  return capBandForTicker(ticker) === band;
}

/** Tickers known to fall in a band (for server-side Discover filtering). */
export function tickersInCapBand(band: CapBand): string[] {
  return UNIVERSE.filter((u) => u.capBand === band).map((u) => u.ticker);
}

export function universeEntry(ticker: string): UniverseEntry | undefined {
  return UNIVERSE.find((u) => u.ticker === ticker.toUpperCase());
}
