"use client";

import { useEffect, useState } from "react";

/* Previous score per storage key, captured once per page load. Lives at module
 * scope (not a ref) so StrictMode's double-mount replays the same count-up
 * instead of a cancelled first run permanently freezing the old value. */
const seenScores = new Map<string, number>();

/**
 * Track Score odometer (MOTION.md A.3): counts from the previous value to the
 * new one, once per meaningful change. "Previous" is the last score this
 * browser saw for this analyst (localStorage), so the count-up plays exactly
 * when the score actually moved since the reader last looked -- a resolve
 * landed -- and never on ordinary page loads or rerenders. Falls back to a
 * static number under reduced motion or on first sight of an analyst.
 */
export function ScoreOdometer({ value, storageKey }: { value: number; storageKey: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const key = `stoa-score:${storageKey}`;
    if (!seenScores.has(key)) {
      try {
        const raw = window.localStorage.getItem(key);
        const previous = raw != null ? Number(raw) : NaN;
        seenScores.set(key, Number.isFinite(previous) ? previous : value);
        window.localStorage.setItem(key, String(value));
      } catch {
        seenScores.set(key, value);
      }
    }

    const from = seenScores.get(key) ?? value;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (from === value || reduced) {
      seenScores.set(key, value);
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const duration = 600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else seenScores.set(key, value);
    };
    setDisplay(from);
    raf = requestAnimationFrame(tick);
    // The real score must never depend on rAF firing: a throttled or hidden
    // tab settles to the final value the moment the duration elapses.
    const settle = window.setTimeout(() => {
      seenScores.set(key, value);
      setDisplay(value);
    }, duration + 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, storageKey]);

  return <>{display}</>;
}
