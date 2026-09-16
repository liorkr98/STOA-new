/**
 * The verdict's rules, as plain values and plain sentences.
 *
 * A verdict is a call an analyst's subscribers get first, made public the
 * moment the market settles it. Because it is the platform's proof, the
 * rules are tighter than for a call carried on a video or a brief:
 *
 *   - equities only, under a $2B market cap;
 *   - a horizon between 7 and 180 days;
 *   - one per analyst per rolling 30 days.
 *
 * The client reads these to explain as the analyst types; the server reads
 * the same values at publish so nothing can go out that the screen refused.
 */

import type { ResolvedSymbol } from "@/lib/market/resolve-symbol";

export const VERDICT_CAP_MAX_USD = 2_000_000_000;
export const VERDICT_HORIZON_MIN_DAYS = 7;
export const VERDICT_HORIZON_MAX_DAYS = 180;
export const VERDICT_HORIZON_DEFAULT_DAYS = 45;
export const VERDICT_WINDOW_DAYS = 30;

const DAY_MS = 86_400_000;

/** "$380M", "$1.9B", "$3.2T". */
export function formatMarketCap(n: number): string {
  const abs = Math.abs(n);
  const fmt = (v: number, suffix: string) => {
    const rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
    return `$${rounded}${suffix}`;
  };
  if (abs >= 1e12) return fmt(n / 1e12, "T");
  if (abs >= 1e9) return fmt(n / 1e9, "B");
  if (abs >= 1e6) return fmt(n / 1e6, "M");
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export type VerdictEligibility =
  | { ok: true; marketCap: number; line: string }
  | { ok: false; kind: "macro" | "too_large" | "unknown_cap"; reason: string };

/**
 * Whether a resolved symbol may carry a verdict, and why not when it cannot.
 * A symbol that has not resolved at all is the lookup's problem, not this
 * one's, so this takes only a found symbol.
 */
export function verdictEligibility(r: ResolvedSymbol): VerdictEligibility {
  if (r.kind !== "equity") {
    const what = r.name ? `${r.symbol} is ${r.name.toLowerCase()}` : `${r.symbol} is a macro instrument`;
    return {
      ok: false,
      kind: "macro",
      reason: `${what}, a macro instrument with no market cap. A verdict is a call on a company under $2B. Gold, oil, yields and bitcoin can carry a call on a video or a brief, but not a verdict.`,
    };
  }
  if (r.marketCap == null) {
    return {
      ok: false,
      kind: "unknown_cap",
      reason: `Stoa has no market cap on file for ${r.symbol} yet, so it cannot confirm the name is under $2B. Try another ticker, or check back once the market data has refreshed.`,
    };
  }
  if (r.marketCap >= VERDICT_CAP_MAX_USD) {
    return {
      ok: false,
      kind: "too_large",
      reason: `${r.symbol} is a ${formatMarketCap(r.marketCap)} company. A verdict is a call on a name under $2B, where a subscriber's edge is real. Larger names can carry a call on a video, a brief or a thesis.`,
    };
  }
  return {
    ok: true,
    marketCap: r.marketCap,
    line: `Eligible. Under the $2B cap.`,
  };
}

export function horizonInRange(days: number): boolean {
  return (
    Number.isInteger(days) && days >= VERDICT_HORIZON_MIN_DAYS && days <= VERDICT_HORIZON_MAX_DAYS
  );
}

export function clampHorizon(days: number): number {
  if (!Number.isFinite(days)) return VERDICT_HORIZON_DEFAULT_DAYS;
  return Math.min(VERDICT_HORIZON_MAX_DAYS, Math.max(VERDICT_HORIZON_MIN_DAYS, Math.round(days)));
}

export type VerdictWindow =
  | { open: true }
  | { open: false; unlocksAt: Date; daysLeft: number; line: string };

/**
 * Whether the analyst can publish another verdict, from when their last one
 * went out. Rolling, not calendar: thirty days from that moment.
 */
export function verdictWindow(lastPublishedAt: string | null | undefined, now = Date.now()): VerdictWindow {
  if (!lastPublishedAt) return { open: true };
  const last = new Date(lastPublishedAt).getTime();
  if (!Number.isFinite(last)) return { open: true };
  const unlocks = last + VERDICT_WINDOW_DAYS * DAY_MS;
  if (unlocks <= now) return { open: true };
  const daysLeft = Math.ceil((unlocks - now) / DAY_MS);
  return { open: false, unlocksAt: new Date(unlocks), daysLeft, line: unlockLine(daysLeft) };
}

/** Read as anticipation, never as a refusal. */
export function unlockLine(daysLeft: number): string {
  if (daysLeft <= 1) return "Your next verdict unlocks tomorrow";
  return `Your next verdict unlocks in ${daysLeft} days`;
}

/** The date a verdict published now would resolve on, from its horizon. */
export function resolvesOn(horizonDays: number, now = Date.now()): Date {
  return new Date(now + horizonDays * DAY_MS);
}
