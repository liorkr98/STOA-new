/**
 * The toolbox rail: where it exists and what it holds.
 *
 * The rail was built for the old workspace, where everything was on screen
 * at once and cards needed a permanent home to drag from. The four-types
 * model is a short spine with features behind a menu, so a rail that
 * is always there contradicts the structure beside it. The rule now: the
 * rail exists only where the screen can take what it holds. The card tray
 * where a card can be dropped or put in order (the writer, the cards screen,
 * the video once a clip is loaded), the assistant where its reply has a
 * writer to land in (the writer). Nowhere else, and never folded to icons:
 * a rail that is there is there because the screen needs it.
 */

import type { StepKey } from "@/lib/compose/steps";

export interface RailContents {
  /** The card deck: draggable rows, reorder, Add a card. */
  tray: boolean;
  /** Ask AI, the actions, the fact-check, Visualize, Templates. */
  assistant: boolean;
}

export interface RailFacts {
  /** The type has a writer (every type but a brief). */
  hasWriter: boolean;
  /** A clip is loaded on the video screen, so the timeline can take a drop. */
  hasClip: boolean;
  /** A live publication's clip screen: read-only, nothing can be placed. */
  frozen: boolean;
}

export function railFor(step: StepKey, f: RailFacts): RailContents | null {
  switch (step) {
    case "thesis":
      // The writer takes a dropped card, and every reply the assistant
      // makes (a metric, a chart, a card, a tightened passage) lands in it.
      return f.hasWriter ? { tray: true, assistant: true } : null;
    case "cards":
      // The deck's order is set in the tray; the one AI action that serves
      // cards ("Draft them from what I have written") is on the canvas.
      return { tray: true, assistant: false };
    case "video":
      // The timeline takes a dropped card once there is a clip to place it
      // on. Before that, and on a live piece's read-only clip, nothing here
      // can take anything.
      return f.hasClip && !f.frozen ? { tray: true, assistant: false } : null;
    default:
      return null;
  }
}
