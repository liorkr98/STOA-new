"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useHydrated, useStoredValue } from "@/lib/hooks/use-stored-value";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  type ConsentChoice,
  parseConsent,
} from "@/lib/privacy/consent";

export { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, hasAnalyticsConsent } from "@/lib/privacy/consent";

export function CookieConsentBanner() {
  const consent = useStoredValue(COOKIE_CONSENT_KEY, parseConsent, null, COOKIE_CONSENT_EVENT);
  const hydrated = useHydrated();

  function save(choice: ConsentChoice) {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
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
          <Link href="/cookies" className="underline hover:no-underline">
            Cookie policy
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            onClick={() => save("essential")}
          >
            Essential only
          </button>
          <button type="button" className={buttonClass("ink", "sm")} onClick={() => save("all")}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
