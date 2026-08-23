import { RANKING } from "./weights";

export interface DiversifyItem {
  analystId: string;
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
