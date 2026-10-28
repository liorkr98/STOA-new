import type { Direction, TickerInfo, VideoTicker } from "@/lib/types";
import type { Segment } from "@/lib/transcript";

/** What the YouTube page and the popup ask the background for. */
export type Request =
  | { type: "lookup"; videoId: string }
  | { type: "detect"; videoId: string; language: string; segments: Segment[] }
  | { type: "info"; ticker: string }
  | { type: "tap"; ticker: string; direction: Direction; videoId: string | null; videoChannel: string | null; videoSeconds: number | null }
  | { type: "undo"; tapId: string }
  | { type: "open"; path: string }
  | { type: "signout" };

export type DetectAnswer = { items: VideoTicker[] | null; error?: string };

export type Answer<R extends Request> = R extends { type: "lookup" | "detect" }
  ? DetectAnswer
  : R extends { type: "info" }
    ? TickerInfo | null
    : R extends { type: "tap" }
      ? { tapId: string }
      : null;

export function ask<R extends Request>(request: R): Promise<Answer<R>> {
  return browser.runtime.sendMessage(request) as Promise<Answer<R>>;
}

/** Stoa's origin for this build. */
export const STOA = __STOA_ORIGIN__;
