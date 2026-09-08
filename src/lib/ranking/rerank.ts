import { RANKING } from "./weights";

export interface DiversifyItem {
  analystId: string;
}

export function uniqueByKey<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Identity of the file on the wire, not the report. Distinct Bunny guids and
 * report ids can still point at the same MP4 (demo seed does this). Query
 * strings are ignored so `?v=` cache busts do not count as new videos.
 */
export function clipPlaybackKey(clip: {
  id: string;
  bunny_video_guid?: string | null;
  playback_url: string | null;
}): string {
  const url = clip.playback_url?.trim();
  if (url) {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch {
      const q = url.indexOf("?");
      return (q === -1 ? url : url.slice(0, q)).toLowerCase();
    }
  }
  if (clip.bunny_video_guid) return `guid:${clip.bunny_video_guid}`;
  return `id:${clip.id}`;
}

/**
 * Explore hands off with `?at=<report id>`. Uniqueness may have kept a
 * different report that plays the same file; put the requested report first
 * and drop the sibling so the session still has one copy of that file.
 */
export function pinRequestedClip<
  T extends {
    reportId: string;
    item: { id: string; bunny_video_guid?: string | null; playback_url: string | null };
  },
>(ranked: T[], requested: T | undefined): T[] {
  if (!requested) return ranked;
  if (ranked.some((r) => r.reportId === requested.reportId)) return ranked;
  const key = clipPlaybackKey(requested.item);
  return [requested, ...ranked.filter((r) => clipPlaybackKey(r.item) !== key)];
}

/**
 * Layout rule, not a scoring hack: cap how much of one analyst can appear in
 * a session so a high-volume poster cannot swamp the Feed.
 */
export function diversify<T extends DiversifyItem>(
  items: T[],
  opts?: { maxConsecutive?: number; maxPerWindow?: number; windowSize?: number },
): T[] {
  const maxConsecutive = opts?.maxConsecutive ?? RANKING.MAX_CONSECUTIVE_PER_ANALYST;
  const maxPerWindow = opts?.maxPerWindow ?? RANKING.MAX_PER_WINDOW;
  const windowSize = opts?.windowSize ?? RANKING.WINDOW_SIZE;
  if (items.length <= 1) return items.slice();

  const queue = items.slice();
  const out: T[] = [];

  const consecutive = (analystId: string) => {
    let n = 0;
    for (let i = out.length - 1; i >= 0 && out[i]!.analystId === analystId; i--) n += 1;
    return n;
  };
  const inWindow = (analystId: string) => {
    const start = Math.max(0, out.length - windowSize + 1);
    let n = 0;
    for (let i = start; i < out.length; i++) if (out[i]!.analystId === analystId) n += 1;
    return n;
  };
  const canPlace = (item: T) =>
    consecutive(item.analystId) < maxConsecutive && inWindow(item.analystId) < maxPerWindow;

  while (queue.length > 0) {
    const idx = queue.findIndex(canPlace);
    if (idx === -1) {
      out.push(queue.shift()!);
    } else {
      out.push(queue.splice(idx, 1)[0]!);
    }
  }
  return out;
}
