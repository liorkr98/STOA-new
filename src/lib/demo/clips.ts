import { isDeadMediaUrl, isDirectVideoUrl } from "@/lib/video/direct";

/**
 * Short playable stand-ins for investor demos. Live Bunny rows currently point
 * at empty ~24MB objects that 403 on the CDN; the Feed mapper swaps those for
 * these clips so the room is not a black rectangle.
 */

export const DEMO_CLIP_COUNT = 8;

export function demoClipPath(index: number): { src: string; poster: string } {
  const n = String((Math.abs(index) % DEMO_CLIP_COUNT) + 1).padStart(2, "0");
  return {
    src: `/demo/clips/clip-${n}.mp4`,
    poster: `/demo/clips/clip-${n}.jpg`,
  };
}

/** Use a stored mp4 when we have one; otherwise a local demo clip. */
export function resolveClipPlayback(input: {
  playbackUrl: string | null | undefined;
  thumbnailUrl: string | null | undefined;
  index: number;
}): { src: string; poster: string | null } {
  const demo = demoClipPath(input.index);
  if (isDirectVideoUrl(input.playbackUrl)) {
    const poster =
      input.thumbnailUrl && !isDeadMediaUrl(input.thumbnailUrl) ? input.thumbnailUrl : demo.poster;
    return { src: input.playbackUrl!, poster };
  }
  const poster =
    input.thumbnailUrl && !isDeadMediaUrl(input.thumbnailUrl) ? input.thumbnailUrl : demo.poster;
  return { src: demo.src, poster };
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
