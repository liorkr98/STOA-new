import { UNIVERSE } from "@/lib/universe";

/** Approximate market-cap bands for Discover filtering (static, not live quotes). */
export type CapBand = "mega" | "large" | "mid" | "small";

const BAND_BY_TICKER: Record<string, CapBand> = {
  NVDA: "mega",
  AAPL: "mega",
  MSFT: "mega",
  GOOGL: "mega",
  AMZN: "mega",
  META: "mega",
  TSLA: "mega",
  AMD: "large",
  JPM: "large",
  XOM: "large",
  PLTR: "mid",
  COIN: "mid",
};

for (const u of UNIVERSE) {
  if (!BAND_BY_TICKER[u.ticker]) BAND_BY_TICKER[u.ticker] = "large";
}

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
