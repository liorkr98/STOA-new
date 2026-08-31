import { isPlayableVideoUrl } from "@/lib/video/direct";

/**
 * Short playable stand-ins for investor demos.
 *
 * These are multi-megabyte progressive MP4s with no bitrate ladder, so they
 * are a demo tool and not a delivery path: on a phone connection they cost
 * more than every other optimization on the surface combined. Real rows play
 * their own HLS; this only fills in when a row has nothing playable, or when
 * `STOA_DEMO_CLIPS=1` forces it for a walkthrough.
 */

export const DEMO_CLIP_COUNT = 8;

export function demoClipPath(index: number): { src: string; poster: string } {
  const n = String((Math.abs(index) % DEMO_CLIP_COUNT) + 1).padStart(2, "0");
  return {
    src: `/demo/clips/clip-${n}.mp4?v=3`,
    poster: `/demo/clips/clip-${n}.jpg?v=3`,
  };
}

/** Server-only switch, so a demo never leaks into a production bundle. */
export function demoClipsForced(): boolean {
  return process.env.STOA_DEMO_CLIPS === "1";
}

/**
 * Play what the row actually has. HLS counts as playable, which is the whole
 * point: it is the adaptive path and it is what Bunny produces.
 */
export function resolveClipPlayback(input: {
  playbackUrl: string | null | undefined;
  thumbnailUrl: string | null | undefined;
  index: number;
}): { src: string; poster: string | null } {
  if (!demoClipsForced() && isPlayableVideoUrl(input.playbackUrl)) {
    return { src: input.playbackUrl!, poster: input.thumbnailUrl ?? null };
  }
  const demo = demoClipPath(input.index);
  return { src: demo.src, poster: input.thumbnailUrl || demo.poster };
}

/** Seeded walk so a chart is never blank when Yahoo is quiet. */
export function demoPriceSeries(ticker: string, n = 30): number[] {
  let h = 2166136261;
  for (let i = 0; i < ticker.length; i++) h = Math.imul(h ^ ticker.charCodeAt(i), 16777619);
  let v = 40 + (h >>> 0) % 180;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    v = Math.max(4, v * (1 + (((h >>> 0) % 91) - 44) / 900));
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}
