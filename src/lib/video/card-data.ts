import type { Direction } from "@/lib/types";

/**
 * Client-safe shape for the reusable video card (Part 4.1). Built on the server
 * by `toVideoCardData` so no Bunny/env code ships to the browser. Used by both
 * Discover (Part 4) and the Dispatch (Part 5) -- one card component, two places.
 */
export interface VideoCardAnalyst {
  /** Profile id, for the placeholder thumbnail's stable colour. */
  id: string | null;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  score: number | null;
  sampleSize?: number;
}

export interface VideoCardData {
  /** video_clips.id -- used for view/click-through tracking. */
  id: string;
  reportId: string;
  /** Bunny embed URL (built server-side). */
  embedUrl: string;
  /** Raw HLS playlist URL, used to prefetch the first seconds of playback. */
  playbackUrl: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  durationSeconds: number;
  headline: string;
  ticker: string | null;
  direction: Direction | null;
  access: string;
  price: number | null;
  analyst: VideoCardAnalyst;
  /** Disclosure inherited from the linked report (Part 2.6). */
  disclosure: {
    positionHeld: boolean | null;
    compensationTied: boolean | null;
  };
}
