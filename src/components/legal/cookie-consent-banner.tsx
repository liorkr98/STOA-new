"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useHydrated, useStoredValue } from "@/lib/hooks/use-stored-value";

const STORAGE_KEY = "stoa_cookie_consent";
const CONSENT_EVENT = "stoa-cookie-consent";

type ConsentChoice = "essential" | "all";

function parseConsent(raw: string | null): ConsentChoice | null {
  return raw === "essential" || raw === "all" ? raw : null;
}

function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  return parseConsent(localStorage.getItem(STORAGE_KEY));
}

export function CookieConsentBanner() {
  // Read straight from storage. The banner hides because the stored value
  // changed, not because an effect pushed it into state.
  const consent = useStoredValue(STORAGE_KEY, parseConsent, null, CONSENT_EVENT);
  // Stays out of the server HTML, so someone who already chose never sees it flash.
  const hydrated = useHydrated();

  function save(choice: ConsentChoice) {
    localStorage.setItem(STORAGE_KEY, choice);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!hydrated || consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 z-[100] border-t border-border bg-surface/95 pl-[max(1.25rem,var(--safe-left))] pr-[max(1.25rem,var(--safe-right))] pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-sm"
      style={{ bottom: "var(--tab-h, 0px)" }}
    >
      <div className="mx-auto flex max-w-[var(--w-wide)] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-mute">
          We use essential cookies to run Stoa. Optional analytics stay off unless you accept.{" "}
          <Link href="/cookies" className="text-accent underline hover:no-underline">
            Cookie policy
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => save("essential")}
          >
            Essential only
          </button>
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            onClick={() => save("all")}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/** Returns true when non-essential tracking may run (user explicitly accepted). */
export function hasAnalyticsConsent(): boolean {
  return readConsent() === "all";
}
