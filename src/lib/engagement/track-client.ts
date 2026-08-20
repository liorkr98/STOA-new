"use client";

/**
 * Client-side engagement batcher (backend brief item 4). Events accumulate in
 * memory and flush on a timer, when the buffer fills, or when the page hides -
 * so a scroll session is one request instead of one per impression. Uses
 * sendBeacon on the page-hide flush so the last batch survives navigation.
 *
 * Fire-and-forget by design: analytics must never surface an error to a reader
 * or block an interaction.
 */

export type EngagementKind =
  | "impression"
  | "play"
  | "watch_progress"
  | "swipe_depth"
  | "cta_reach"
  | "unlock"
  | "subscribe"
  | "follow_from_surface";

export interface EngagementEvent {
  reportId: string;
  kind: EngagementKind;
  value?: number;
  surface?: string;
}

const ENDPOINT = "/api/engagement";
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BUFFER = 50;

let buffer: EngagementEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function post(events: EngagementEvent[], useBeacon: boolean): void {
  if (events.length === 0) return;
  const body = JSON.stringify({ events });

  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    } catch {
      // fall through to fetch
    }
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function flushEngagement(useBeacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const pending = buffer;
  buffer = [];
  post(pending, useBeacon);
}

function bindListeners(): void {
  if (listenersBound || typeof document === "undefined") return;
  listenersBound = true;
  // pagehide + visibilitychange together cover Safari/iOS and the rest.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEngagement(true);
  });
  window.addEventListener("pagehide", () => flushEngagement(true));
}

/** Queue one event. Deduplicates repeat impressions of the same publication. */
export function trackEngagement(event: EngagementEvent): void {
  if (!event.reportId) return;
  bindListeners();

  if (event.kind === "impression") {
    const seen = buffer.some(
      (e) => e.kind === "impression" && e.reportId === event.reportId && e.surface === event.surface,
    );
    if (seen) return;
  }

  buffer.push(event);

  if (buffer.length >= MAX_BUFFER) {
    flushEngagement();
    return;
  }
  if (!timer) {
    timer = setTimeout(() => flushEngagement(), FLUSH_INTERVAL_MS);
  }
}
