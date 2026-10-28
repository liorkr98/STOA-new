import { transcriptLanguage, type Segment } from "@/lib/transcript";
import { readTranscriptFromPanel } from "@/lib/youtube/panel";
import { askPage, type DirectSegment, type VideoDetails } from "@/lib/youtube/page-bridge";

/** The watch page's video id; null on Shorts, live pages, the home page and the rest. */
export function watchVideoId(url: URL = new URL(location.href)): string | null {
  if (url.pathname !== "/watch") return null;
  const v = url.searchParams.get("v");
  return v && /^[\w-]{11}$/.test(v) ? v : null;
}

/**
 * Calls back with the video id each time YouTube's in-page navigation lands
 * on a different page (null when it is not a watch page). YouTube swaps pages
 * without reloading; `yt-navigate-finish` is its own signal that one landed.
 */
export function onWatchChange(callback: (videoId: string | null) => void): () => void {
  let last: string | null | undefined;
  const check = () => {
    const id = watchVideoId();
    if (id === last) return;
    last = id;
    callback(id);
  };
  document.addEventListener("yt-navigate-finish", check);
  window.addEventListener("popstate", check);
  const poll = window.setInterval(check, 1500);
  check();
  return () => {
    document.removeEventListener("yt-navigate-finish", check);
    window.removeEventListener("popstate", check);
    window.clearInterval(poll);
  };
}

export type ReadVideo =
  | { kind: "transcript"; details: VideoDetails; segments: Segment[]; language: string }
  | { kind: "skip"; reason: "live" | "no-transcript" | "left" };

async function details(videoId: string): Promise<VideoDetails | null> {
  // The player answers for the previous video for a moment after navigating.
  for (let i = 0; i < 20; i++) {
    const d = await askPage<VideoDetails>({ kind: "video", videoId }, 2000);
    if (d) return d;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/**
 * Reads the timestamped transcript in the reader's own browser, the way
 * YouTube's transcript panel gets it: first the panel's request from the page,
 * then, when YouTube refuses that, the panel itself opened out of sight.
 */
export async function readVideo(videoId: string): Promise<ReadVideo> {
  const d = await details(videoId);
  if (watchVideoId() !== videoId) return { kind: "skip", reason: "left" };
  if (!d) return { kind: "skip", reason: "no-transcript" };
  if (d.isLive) return { kind: "skip", reason: "live" };

  const direct = await askPage<DirectSegment[]>({ kind: "transcript", videoId }, 15_000);
  if (direct?.length) {
    return { kind: "transcript", details: d, segments: direct, language: transcriptLanguage(null, direct) };
  }
  const panel = await readTranscriptFromPanel(videoId, d.duration ?? undefined);
  if (watchVideoId() !== videoId) return { kind: "skip", reason: "left" };
  if (!panel) return { kind: "skip", reason: "no-transcript" };
  return { kind: "transcript", details: d, segments: panel.segments, language: panel.language };
}

/**
 * The video's own clock, read from the player: play, pause, seek and speed
 * come for free from `currentTime`. While an ad plays the time belongs to the
 * ad, so the clock reports "not running" and nothing is scheduled.
 */
export class PlaybackClock {
  private video: HTMLVideoElement | null = null;
  private timer: number | null = null;
  private readonly onTick: () => void;

  constructor(onTick: () => void) {
    this.onTick = onTick;
  }

  start() {
    this.stop();
    const events = ["timeupdate", "seeked", "play", "pause", "ratechange"] as const;
    const tick = () => this.onTick();
    const bind = () => {
      const v = document.querySelector<HTMLVideoElement>("#movie_player video.html5-main-video, #movie_player video");
      if (v === this.video) return;
      if (this.video) for (const e of events) this.video.removeEventListener(e, tick);
      this.video = v;
      if (v) for (const e of events) v.addEventListener(e, tick);
    };
    bind();
    // The player swaps its <video> between ads and the video; re-find it.
    this.timer = window.setInterval(() => {
      bind();
      tick();
    }, 1000);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  get inAd(): boolean {
    const player = document.getElementById("movie_player");
    return Boolean(player?.classList.contains("ad-showing") || player?.classList.contains("ad-interrupting"));
  }

  get time(): number | null {
    if (!this.video || this.inAd) return null;
    return this.video.currentTime;
  }

  get playing(): boolean {
    return Boolean(this.video && !this.video.paused && !this.video.ended && !this.inAd);
  }

  seek(seconds: number) {
    if (this.video && !this.inAd) this.video.currentTime = seconds;
  }
}
