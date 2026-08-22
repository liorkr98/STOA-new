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
  // Captured once, as this component first renders: the score the reader last
  // saw. Seeding it here rather than in an effect means the first painted frame
  // is already the old number, so the count-up never flashes the final value
  // first. Reduced motion collapses origin onto value, which makes it static.
  const [origin] = useState(() => {
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
    const previous = seenScores.get(key) ?? value;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    return reduced ? value : previous;
  });

  // null means "not counting", and the number shows as itself.
  const [frame, setFrame] = useState<number | null>(origin === value ? null : origin);
  const display = frame ?? value;

  useEffect(() => {
    const key = `stoa-score:${storageKey}`;
    if (origin === value) {
      seenScores.set(key, value);
      return;
    }

    const start = performance.now();
    const duration = 600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setFrame(Math.round(origin + (value - origin) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        seenScores.set(key, value);
        setFrame(null);
      }
    };
    raf = requestAnimationFrame(tick);
    // The real score must never depend on rAF firing: a throttled or hidden
    // tab settles to the final value the moment the duration elapses.
    const settle = window.setTimeout(() => {
      seenScores.set(key, value);
      setFrame(null);
    }, duration + 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, storageKey, origin]);

  return <>{display}</>;
}
