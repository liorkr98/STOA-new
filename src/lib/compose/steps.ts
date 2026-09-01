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
 * A Research piece and a Post have no video module, so they are not walked
 * through two video steps only to be told there is nothing to do. Editing a
 * video appears once there is a video to edit.
 */
export function stepsFor(mode: ComposeMode, hasVideo: boolean): StepDef[] {
  const keys: StepKey[] = ["write", "call", "cards"];
  if (mode === "video") {
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
