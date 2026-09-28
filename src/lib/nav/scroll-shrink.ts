/**
 * The arithmetic behind the floating tab bar's shrink-on-scroll.
 *
 * The bar does not flip between two sizes. It carries a progress from 0
 * (full size) to 1 (shrunk) that moves with the scroll: every pixel down
 * adds to it and every pixel up takes away, so the bar travels with the
 * thumb and stops when the thumb stops. Near the top of the page the
 * progress is capped by the distance to the top, so arriving back at the
 * top always finishes at full size.
 *
 * Kept pure and separate from the component so the rules have tests; the
 * component only smooths the result and draws it.
 */

export interface ShrinkState {
  /** 0 is full size, 1 is fully shrunk. */
  progress: number;
  lastY: number;
}

/** Scroll distance, in CSS pixels, from full size to fully shrunk. */
export const SHRINK_RANGE = 64;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function initialShrinkState(y = 0): ShrinkState {
  return { progress: 0, lastY: y };
}

export function nextShrinkState(state: ShrinkState, y: number): ShrinkState {
  const dy = y - state.lastY;
  const moved = clamp(state.progress + dy / SHRINK_RANGE);
  // Within one range of the top the bar can be no smaller than the distance
  // left to the top allows, so it opens out on the way up and is whole at 0.
  const progress = Math.min(moved, clamp(y / SHRINK_RANGE));
  return { progress, lastY: y };
}

/** Where the bar comes to rest once the scroll stops: whichever end is nearer. */
export function restingProgress(progress: number): 0 | 1 {
  return progress >= 0.5 ? 1 : 0;
}
