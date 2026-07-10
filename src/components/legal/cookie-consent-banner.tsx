"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";

const STORAGE_KEY = "stoa_cookie_consent";

type ConsentChoice = "essential" | "all";

function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "essential" || v === "all" ? v : null;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  function save(choice: ConsentChoice) {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-surface/95 px-5 py-3 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
