"use client";

import { devRefreshRoute } from "../actions";

const devButton =
  "num focus-ring rounded border border-dashed border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-faint hover:text-text";

/**
 * Two ways to hurt the workspace on purpose. A save refresh is what every
 * successful save causes. A crash is what a rendering bug causes: the
 * current step throws on its next render, and the step boundary has to
 * catch it and keep the creator where they were.
 */
export function RefreshButton() {
  return (
    <>
      <button type="button" onClick={() => void devRefreshRoute()} className={devButton}>
        Simulate a save refresh
      </button>
      <button
        type="button"
        onClick={() => {
          const current = document.querySelector('nav[aria-label="Compose steps"] [aria-current="step"]');
          const label = current?.textContent?.replace(/^\d+/, "").replace(/optional|empty$/i, "").trim().toLowerCase();
          const key =
            label === "edit video" ? "video_edit" : label === "the call" ? "call" : (label ?? "write");
          window.__stoaCrashStep = key;
          // Nothing re-renders on its own; the fixture presses the step's
          // own button below or types into it to trigger the draw.
        }}
        className={devButton}
      >
        Crash the current step on its next draw
      </button>
    </>
  );
}
