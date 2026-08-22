"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/* Previous score per storage key, captured once per page load. Lives at module
 * scope (not a ref) so StrictMode's double-mount replays the same count-up
 * instead of a cancelled first run permanently freezing the old value. */
const seenScores = new Map<string, number>();

const noopSubscribe = () => () => {};

/**
 * The score this browser last saw for `key`, seeded once per page load. Only
 * ever called on the client: the server snapshot below returns the current
 * value instead, so the markup React hydrates against is the plain number.
 */
function readPreviousScore(key: string, value: number): number {
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
}

/**
 * Track Score odometer (MOTION.md A.3): counts from the previous value to the
 * new one, once per meaningful change. "Previous" is the last score this
 * browser saw for this analyst (localStorage), so the count-up plays exactly
 * when the score actually moved since the reader last looked -- a resolve
 * landed -- and never on ordinary page loads or rerenders. Falls back to a
 * static number under reduced motion or on first sight of an analyst.
 */
export function ScoreOdometer({ value, storageKey }: { value: number; storageKey: string }) {
  const key = `stoa-score:${storageKey}`;

  // Server and the hydrating render both see the current value, so the markup
  // matches; the moment hydration finishes React re-reads and the old score
  // appears, which is what the count-up starts from. No effect writes state to
  // get there, and nothing touches window during prerender.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => readPreviousScore(key, value),
    () => value,
  );

  // Null until the animation produces a frame, so the number shows as origin.
  const [frame, setFrame] = useState<number | null>(null);
  const display = frame ?? origin;

  useEffect(() => {
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
        setFrame(value);
      }
    };
    raf = requestAnimationFrame(tick);
    // The real score must never depend on rAF firing: a throttled or hidden
    // tab settles to the final value the moment the duration elapses.
    const settle = window.setTimeout(() => {
      seenScores.set(key, value);
      setFrame(value);
    }, duration + 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, key, origin]);

  return <>{display}</>;
}
