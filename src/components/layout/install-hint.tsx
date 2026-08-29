"use client";

import { useSyncExternalStore } from "react";
import { useHydrated, useStoredValue } from "@/lib/hooks/use-stored-value";
import { isIosSafari, isStandaloneDisplay } from "@/lib/pwa/display";
import { buttonClass } from "@/components/ui/button";

const STORAGE_KEY = "stoa_install_hint";
const EVENT = "stoa-install-hint";

type PromptEvent = Event & { prompt: () => Promise<void> };

let deferredPrompt: PromptEvent | null = null;

function subscribePrompt(onChange: () => void) {
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as PromptEvent;
    onChange();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  return () => window.removeEventListener("beforeinstallprompt", onPrompt);
}

function getPrompt() {
  return deferredPrompt;
}

function parseDismissed(raw: string | null): boolean {
  return raw === "1";
}

/**
 * Shown only in the browser, never inside an already-installed window.
 * Android Chrome can install from the button; iOS Safari is told to use Share.
 */
export function InstallHint() {
  const hydrated = useHydrated();
  const dismissed = useStoredValue(STORAGE_KEY, parseDismissed, false, EVENT);
  const prompt = useSyncExternalStore(subscribePrompt, getPrompt, () => null);

  if (!hydrated || dismissed || isStandaloneDisplay()) return null;

  const ios = isIosSafari();
  if (!ios && !prompt) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div
      role="region"
      aria-label="Install Stoa"
      className="fixed inset-x-0 z-[45] border-t border-border bg-surface pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-2.5 pb-[max(0.5rem,var(--safe-bottom))]"
      style={{ bottom: "var(--tab-h, 0px)" }}
    >
      <div className="mx-auto flex max-w-[var(--w-wide)] items-start justify-between gap-3">
        <p className="text-sm text-text">
          {ios
            ? "Add Stoa to your Home Screen: tap Share, then Add to Home Screen."
            : "Install Stoa for full-screen video, without the browser chrome."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {prompt ? (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={() => void prompt.prompt().catch(() => undefined)}
            >
              Install
            </button>
          ) : null}
          <button type="button" className={buttonClass("secondary", "sm")} onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
