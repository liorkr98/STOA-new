/**
 * The guided compose sequence.
 *
 * The workspace had the opposite problem to the old wizard: everything was on
 * screen at once and nothing was led, so the steps that are easy to miss got
 * missed. Cards in particular: they sat in a rail, optional and unexplained,
 * and most publications simply never got any.
 *
 * So the canvas is one step at a time and the order is the order a creator
 * actually thinks in: say the thing, then what you are claiming, then the
 * evidence, then the clip, then how it goes out. The rail keeps the card tray
 * and the assistant across every step, because a card has to be draggable into
 * the body and onto the timeline from wherever the creator is.
 *
 * The sequence guides on the first pass and gets out of the way afterwards:
 * once a step has been visited it can be jumped to directly.
 */

import type { ComposeMode } from "@/lib/compose/modes";
import type { Direction } from "@/lib/types";

export type StepKey =
  | "write"
  | "call"
  | "cards"
  | "video"
  | "video_edit"
  | "tags"
  | "publish";

export interface StepDef {
  key: StepKey;
  label: string;
  /** Optional steps are offered, never demanded. */
  optional: boolean;
  /** One line under the step heading: what this step is for. */
  blurb: string;
}

const ALL: Record<StepKey, StepDef> = {
  write: {
    key: "write",
    label: "Write",
    optional: false,
    blurb: "The headline and the words. Everything else is built around this.",
  },
  call: {
    key: "call",
    label: "The call",
    optional: true,
    blurb:
      "A ticker, a direction, a target and a horizon. It is offered here because it is part of what you are claiming, not a setting you configure on the way out.",
  },
  cards: {
    key: "cards",
    label: "Cards",
    optional: true,
    blurb:
      "The short version of your argument, in the reader's hand before they commit to the whole thing.",
  },
  video: {
    key: "video",
    label: "Video",
    optional: true,
    blurb: "Record one, upload one, or carry on without.",
  },
  video_edit: {
    key: "video_edit",
    label: "Edit video",
    optional: true,
    blurb: "Trim it, choose the frame people click, and place your cards on the clock.",
  },
  tags: {
    key: "tags",
    label: "Tags",
    optional: false,
    blurb: "Where this sits, so the right readers find it.",
  },
  publish: {
    key: "publish",
    label: "Publish",
    optional: false,
    blurb: "Who can read it, what it costs, what you are disclosing, and out it goes.",
  },
};

/**
 * The steps this publication actually has.
 *
 * The video step is offered to everything except a Post, because it is now
 * the place where having a video is decided rather than somewhere a creator
 * arrives after declaring the format on a tab. Editing a video appears once
 * there is a video to edit, and disappears again if the clip is dropped.
 */
export function stepsFor(mode: ComposeMode, hasVideo: boolean): StepDef[] {
  const keys: StepKey[] = ["write", "call", "cards"];
  if (mode !== "short_post") {
    keys.push("video");
    if (hasVideo) keys.push("video_edit");
  }
  keys.push("tags", "publish");
  return keys.map((k) => ALL[k]);
}

export type StepState = "done" | "empty";

/** What each step currently holds, for the progress rail. */
export interface StepFacts {
  hasWriting: boolean;
  hasCall: boolean;
  cardCount: number;
  hasVideo: boolean;
  hasVideoEdits: boolean;
  hasTags: boolean;
  readyToPublish: boolean;
}

export function stepState(key: StepKey, f: StepFacts): StepState {
  switch (key) {
    case "write":
      return f.hasWriting ? "done" : "empty";
    case "call":
      return f.hasCall ? "done" : "empty";
    case "cards":
      return f.cardCount > 0 ? "done" : "empty";
    case "video":
      return f.hasVideo ? "done" : "empty";
    case "video_edit":
      return f.hasVideoEdits ? "done" : "empty";
    case "tags":
      return f.hasTags ? "done" : "empty";
    case "publish":
      return f.readyToPublish ? "done" : "empty";
  }
}

/** What the one forward button on a step will do when pressed. */
export interface Advance {
  /** Skip when the step is optional and holds nothing; Continue otherwise. */
  label: "Skip" | "Continue";
  /**
   * Why pressing will not advance, in the creator's own terms, or null when
   * it will. Specific on purpose: "a target price needs a ticker", never
   * "invalid input".
   */
  blocker: string | null;
}

/** Everything the forward button needs to know, as plain values. */
export interface AdvanceInput {
  isPost: boolean;
  postMaxChars: number;
  title: string;
  postText: string;
  ticker: string;
  /** Null until the creator has chosen one. A call is a ticker and a direction. */
  direction: Direction | null;
  target: string;
  /**
   * Whether the ticker in the field is a real, priceable name. "checking"
   * while the answer is on its way; "frozen" for a live publication, whose
   * call was checked when it was locked and cannot change now.
   */
  symbol: "idle" | "checking" | "found" | "missing" | "failed" | "frozen";
  /** Each card in the deck by name, and whether anything is written on it. */
  cards: { name: string; empty: boolean }[];
  hasVideo: boolean;
  hasVideoEdits: boolean;
  /** Text overlays with no words on them. */
  wordlessOverlays: number;
  /** Visualize overlays with neither a prompt nor a picture. */
  blankVisuals: number;
  primaryTag: string | null;
}

/**
 * One button per step, and its label is what pressing it will do.
 *
 * There used to be two: Continue, and a separate skip button on the optional
 * steps. Two buttons meant the creator had to work out which one was true
 * for them. Now the step works it out: nothing entered on an optional step
 * reads Skip and moves on; enough entered reads Continue and moves on;
 * something entered but incomplete still reads Continue, but pressing it
 * says what is missing and stays put.
 */
export function advanceFor(key: StepKey, s: AdvanceInput): Advance {
  const go = (blocker: string | null = null): Advance => ({ label: "Continue", blocker });
  const skip: Advance = { label: "Skip", blocker: null };
  switch (key) {
    case "write": {
      if (s.isPost) {
        const text = s.postText.trim();
        if (!text) return go("Write your post first.");
        if (text.length > s.postMaxChars) {
          return go(`Posts are ${s.postMaxChars} characters. This one is ${text.length}.`);
        }
        return go();
      }
      return s.title.trim() ? go() : go("Add a headline first. The words can wait; the headline cannot.");
    }
    case "call": {
      const ticker = s.ticker.trim().toUpperCase();
      const target = s.target.trim();
      const hasDirection = s.direction !== null;
      if (!ticker && !target && !hasDirection) return skip;
      if (s.symbol === "frozen") return go();
      // A call is a ticker and a direction; a target is extra. Each thing
      // that can be half-entered gets its own sentence, in the order the
      // creator would fix them: the ticker first, because nothing else on
      // the step means anything without it.
      if (!ticker) {
        return go(
          target
            ? "A target price needs a ticker. Add the ticker, or clear the target."
            : "A direction needs a ticker. Add the ticker, or clear the direction.",
        );
      }
      if (s.symbol === "checking") {
        return go(`Still checking ${ticker}. Give it a second, then press Continue again.`);
      }
      if (s.symbol === "missing") {
        return go(`${ticker} was not found. Check the symbol, or clear it.`);
      }
      if (s.symbol === "failed") {
        return go(`${ticker} could not be checked just now. Try again in a moment.`);
      }
      if (!hasDirection) {
        return go(`A call needs a direction. Choose long, short or hold for ${ticker}.`);
      }
      if (target && !(Number(target) > 0)) {
        return go(`"${target}" is not a price. A target is a number, like 142.50.`);
      }
      return go();
    }
    case "cards": {
      if (s.cards.length === 0) return skip;
      const blank = s.cards.find((c) => c.empty);
      if (blank) return go(`The ${blank.name} card has nothing on it yet. Write it, or delete it.`);
      return go();
    }
    case "video":
      return s.hasVideo ? go() : skip;
    case "video_edit": {
      if (s.wordlessOverlays > 0) {
        return go(
          s.wordlessOverlays === 1
            ? "A text overlay has no words on it yet. Type them, or remove it."
            : `${s.wordlessOverlays} text overlays have no words on them yet.`,
        );
      }
      if (s.blankVisuals > 0) {
        return go("A Visualize overlay has nothing to show yet. Describe the diagram, or remove it.");
      }
      return s.hasVideoEdits ? go() : skip;
    }
    case "tags":
      return s.primaryTag ? go() : go("Choose a primary tag. It is where this sits in Explore.");
    case "publish":
      return go();
  }
}
