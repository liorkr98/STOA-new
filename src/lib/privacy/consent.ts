export const COOKIE_CONSENT_KEY = "stoa_cookie_consent";
export const COOKIE_CONSENT_EVENT = "stoa-cookie-consent";

export type ConsentChoice = "essential" | "all";

export function parseConsent(raw: string | null): ConsentChoice | null {
  return raw === "essential" || raw === "all" ? raw : null;
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  return parseConsent(localStorage.getItem(COOKIE_CONSENT_KEY));
}

/** True when non-essential tracking (Sentry Replay) may run. */
export function hasAnalyticsConsent(): boolean {
  return readConsent() === "all";
}
