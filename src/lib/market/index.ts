/**
 * The market-data layer -- the ONLY import surface for components and hooks.
 * Never import a provider client or call data.sec.gov / finnhub / FMP directly
 * from a component; go through here. Every payload is zod-validated at the
 * provider boundary. See docs/DATA_STACK.md.
 *
 *   import { edgar, finnhub, fmp, normalizeSymbol, MarketDataError } from "@/lib/market";
 *
 * Live quotes/candles for the scoring engine still live in @/lib/engine/market
 * (Yahoo, Node-only); this layer adds the citable + deep-fundamentals providers.
 */

export * as edgar from "./edgar";
export * as finnhub from "./finnhub";
export * as fmp from "./fmp";

export * from "./types";
export * from "./symbols";
export { TTL, cached, invalidate, clearCache } from "./cache";

// Client-safe chart primitives already living in this directory.
export * from "./candle-types";
