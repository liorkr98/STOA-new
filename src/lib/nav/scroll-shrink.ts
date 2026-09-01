/**
 * The decision behind the floating tab bar's shrink-on-scroll.
 *
 * Kept pure and separate from the component because the interesting part is not
 * the listener, it is the hysteresis: a thumb resting on the glass jitters by a
 * pixel or two, and a bar that toggles on that reads as a flicker. Movement
 * accumulates in one direction and only flips the bar once it passes the
 * threshold, so a deliberate scroll changes state and a twitch never does.
 */

export interface ShrinkState {
  shrunk: boolean;
  /** Movement accumulated since the last flip, signed by direction. */
  drift: number;
  lastY: number;
}

export const TOGGLE_THRESHOLD = 18;
export const TOP_ZONE = 24;

export function initialShrinkState(y = 0): ShrinkState {
  return { shrunk: false, drift: 0, lastY: y };
}

export function nextShrinkState(state: ShrinkState, y: number): ShrinkState {
  const dy = y - state.lastY;

  // Near the top the bar is always full size, whatever the drift says.
  if (y <= TOP_ZONE) return { shrunk: false, drift: 0, lastY: y };

  // A reversal restarts the count, so the threshold measures movement in one
  // direction rather than net distance travelled.
  let drift = (dy > 0 && state.drift < 0) || (dy < 0 && state.drift > 0) ? 0 : state.drift;
  drift += dy;

  if (drift > TOGGLE_THRESHOLD) return { shrunk: true, drift: 0, lastY: y };
  if (drift < -TOGGLE_THRESHOLD) return { shrunk: false, drift: 0, lastY: y };
  return { shrunk: state.shrunk, drift, lastY: y };
}
