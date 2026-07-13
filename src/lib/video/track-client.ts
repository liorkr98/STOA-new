/**
 * Client-side video funnel tracking (Part 1 / Part 2.7). Fire-and-forget. Uses
 * sendBeacon when available so completion/click-through events survive a
 * navigation away to the report.
 */
export interface VideoTrackPayload {
  watchedSeconds?: number;
  completed?: boolean;
  clickedThroughToReport?: boolean;
}

export function trackVideoEvent(videoId: string, payload: VideoTrackPayload): void {
  if (!videoId) return;
  const url = `/api/videos/${videoId}/track-view`;
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
