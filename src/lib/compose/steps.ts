/**
 * The spine and the features menu.
 *
 * Every publication walks a short mandatory spine: the content (a clip, a
 * take, a report, or a call, by type), the headline, then the tags. A video
 * carries its headline on the same screen as the clip, so its spine is two
 * steps; the written types and the verdict keep the headline as a step of
 * its own, so theirs is three. After the spine comes the publish screen, and
 * on it a menu of optional features (a call, cards, a thesis, a video) that
 * nobody has to walk past: opening one goes into that feature's editor and
 * Done brings you back to the menu. Instagram's structure, not a wizard.
 *
 * The one-button rule from the old sequence survives: each screen has one
 * forward button whose label is what pressing it will do. On the spine it
 * reads Continue, and refuses with the reason when the step is not done. In
 * a feature editor it reads Skip when nothing has been added, Done when the
 * feature is complete, and Done that refuses and names what is missing when
 * it is half done. Partial information never passes.
 */

import type { PublicationType } from "@/lib/compose/modes";
import type { VerdictEligibility } from "@/lib/compose/verdict";
import {
  VERDICT_HORIZON_MAX_DAYS,
  VERDICT_HORIZON_MIN_DAYS,
  horizonInRange,
} from "@/lib/compose/verdict";
import type { Direction } from "@/lib/types";

export type StepKey =
  | "video"
  | "brief"
  | "thesis"
  | "call"
  | "cards"
  | "headline"
  | "tags"
  | "publish";

export type FeatureKey = "call" | "cards" | "thesis" | "video";

export interface StepDef {
  key: StepKey;
  label: string;
  /** One line under the heading: what this step is for. */
  blurb: string;
}

const SPINE_STEPS: Record<Exclude<StepKey, "cards" | "publish">, StepDef> = {
  video: {
    key: "video",
    label: "Video",
    blurb: "Record or upload a clip.",
  },
  brief: {
    key: "brief",
    label: "The take",
    blurb: "A short written take.",
  },
  thesis: {
    key: "thesis",
    label: "The report",
    blurb: "The full written argument.",
  },
  call: {
    key: "call",
    label: "The call",
    blurb: "Ticker, direction, and a horizon. Target is optional.",
  },
  headline: {
    key: "headline",
    label: "Headline",
    blurb: "The line that travels with this.",
  },
  tags: {
    key: "tags",
    label: "Tags",
    blurb: "Where this sits.",
  },
};

export const PUBLISH_STEP: StepDef = {
  key: "publish",
  label: "Publish",
  blurb: "Who can read it, then send it out.",
};

/** The content step of each type's spine. */
export function contentStepFor(type: PublicationType): StepKey {
  switch (type) {
    case "video":
      return "video";
    case "brief":
      return "brief";
    case "thesis":
      return "thesis";
    case "verdict":
      return "call";
  }
}

/** True when the type's headline lives on its content screen rather than on a step of its own. */
export function headlineOnContent(type: PublicationType): boolean {
  return type === "video";
}

/** The mandatory steps, in order. Two for a video, three for everything else. Never more. */
export function spineFor(type: PublicationType): StepDef[] {
  const content = SPINE_STEPS[contentStepFor(type) as keyof typeof SPINE_STEPS];
  return headlineOnContent(type) ? [content, SPINE_STEPS.tags] : [content, SPINE_STEPS.headline, SPINE_STEPS.tags];
}

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  /** One line on the menu row: what it is. */
  what: string;
  /** One line under the heading once opened. */
  blurb: string;
}

const FEATURES: Record<FeatureKey, FeatureDef> = {
  call: {
    key: "call",
    label: "A call",
    what: "Ticker, direction, horizon. Locked at publish.",
    blurb: "Entry is the live price at publish. Target is the number you set.",
  },
  cards: {
    key: "cards",
    label: "Cards",
    what: "Evidence a reader can swipe.",
    blurb: "The short version of your argument, before the full piece.",
  },
  thesis: {
    key: "thesis",
    label: "A full thesis",
    what: "The written argument under the video.",
    blurb: "The full written argument.",
  },
  video: {
    key: "video",
    label: "A video",
    what: "A clip that plays with the verdict.",
    blurb: "Record one or upload one.",
  },
};

/** What each type may add, in the order the menu lists them. */
export function featuresFor(type: PublicationType): FeatureDef[] {
  switch (type) {
    case "video":
      return [FEATURES.call, FEATURES.cards, FEATURES.thesis];
    case "brief":
      return [FEATURES.call, FEATURES.cards];
    case "thesis":
      return [FEATURES.call, FEATURES.cards];
    case "verdict":
      return [
        FEATURES.cards,
        FEATURES.video,
        {
          ...FEATURES.thesis,
          label: "Written text",
          what: "A brief or a thesis under the call.",
          blurb: "Write as much as the call needs.",
        },
      ];
  }
}

export function featureDef(type: PublicationType, key: FeatureKey): FeatureDef | undefined {
  return featuresFor(type).find((f) => f.key === key);
}

/** The screen's definition, whichever kind it is. */
export function stepDef(type: PublicationType, key: StepKey): StepDef {
  if (key === "publish") return PUBLISH_STEP;
  const spine = spineFor(type).find((s) => s.key === key);
  if (spine) return spine;
  const feature = featureDef(type, key as FeatureKey);
  if (feature) return { key, label: feature.label, blurb: feature.blurb };
  return SPINE_STEPS[key as keyof typeof SPINE_STEPS] ?? PUBLISH_STEP;
}

export type StepRole = "spine" | "feature" | "publish";

export function roleOf(type: PublicationType, key: StepKey): StepRole {
  if (key === "publish") return "publish";
  return spineFor(type).some((s) => s.key === key) ? "spine" : "feature";
}

export type StepState = "done" | "empty";

/** What each step currently holds, for the tracker and the menu. */
export interface StepFacts {
  hasVideo: boolean;
  /** The headline sits on the video screen (a video publication), so that step is done only with both. */
  headlineOnVideo: boolean;
  hasBrief: boolean;
  hasThesis: boolean;
  /** A complete call: ticker, direction, and for a verdict the target too. */
  hasCall: boolean;
  cardCount: number;
  hasTitle: boolean;
  hasTags: boolean;
  readyToPublish: boolean;
}

export function stepState(key: StepKey, f: StepFacts): StepState {
  switch (key) {
    case "video":
      return f.hasVideo && (!f.headlineOnVideo || f.hasTitle) ? "done" : "empty";
    case "brief":
      return f.hasBrief ? "done" : "empty";
    case "thesis":
      return f.hasThesis ? "done" : "empty";
    case "call":
      return f.hasCall ? "done" : "empty";
    case "cards":
      return f.cardCount > 0 ? "done" : "empty";
    case "headline":
      return f.hasTitle ? "done" : "empty";
    case "tags":
      return f.hasTags ? "done" : "empty";
    case "publish":
      return f.readyToPublish ? "done" : "empty";
  }
}

/** What the one forward button on a screen will do when pressed. */
export interface Advance {
  /** Continue on the spine; Skip or Done in a feature editor. */
  label: "Continue" | "Skip" | "Done";
  /**
   * Why pressing will not advance, in the creator's own terms, or null when
   * it will. Specific on purpose: "a target price needs a ticker", never
   * "invalid input".
   */
  blocker: string | null;
}

/** Everything the forward button needs to know, as plain values. */
export interface AdvanceInput {
  title: string;
  /** The brief's text, and its cap. */
  briefText: string;
  briefMaxChars: number;
  /** The report's words, as plain text. */
  bodyText: string;
  ticker: string;
  /** Null until the creator has chosen one. A call is a ticker and a direction. */
  direction: Direction | null;
  target: string;
  horizon: number;
  /**
   * Whether the ticker in the field is a real, priceable name. "checking"
   * while the answer is on its way; "frozen" for a live publication, whose
   * call was checked when it was locked and cannot change now.
   */
  symbol: "idle" | "checking" | "found" | "missing" | "failed" | "frozen";
  /**
   * The verdict's own check on a found symbol (equities only, under $2B).
   * Null while nothing has been found, or for a call that is not a verdict.
   */
  eligibility: VerdictEligibility | null;
  /** Each card in the deck by name, and whether anything is written on it. */
  cards: { name: string; empty: boolean }[];
  hasVideo: boolean;
  /** Text overlays with no words on them. */
  wordlessOverlays: number;
  /** Visualize overlays with neither a prompt nor a picture. */
  blankVisuals: number;
  primaryTag: string | null;
}

function videoBlockers(s: AdvanceInput): string | null {
  if (s.wordlessOverlays > 0) {
    return s.wordlessOverlays === 1
      ? "A text overlay has no words on it yet. Type them, or remove it."
      : `${s.wordlessOverlays} text overlays have no words on them yet.`;
  }
  if (s.blankVisuals > 0) {
    return "A Visualize overlay has nothing to show yet. Describe the diagram, or remove it.";
  }
  return null;
}

/**
 * A call's blockers, in the order the creator would fix them: the ticker
 * first, because nothing else on the step means anything without it.
 * `verdict` tightens it: a direction is long or short, a target is required,
 * the horizon is bounded, and the name has to pass the verdict's own check.
 */
function callBlockers(s: AdvanceInput, verdict: boolean): string | null {
  const ticker = s.ticker.trim().toUpperCase();
  const target = s.target.trim();
  const hasDirection = s.direction !== null;
  if (s.symbol === "frozen") return null;
  if (!ticker) {
    if (verdict) return "A verdict starts with a ticker. Add the name you are calling.";
    return target
      ? "A target price needs a ticker. Add the ticker, or clear the target."
      : "A direction needs a ticker. Add the ticker, or clear the direction.";
  }
  if (s.symbol === "checking") {
    return `Still checking ${ticker}. Give it a second, then press again.`;
  }
  if (s.symbol === "missing") {
    return `${ticker} was not found. Check the symbol, or clear it.`;
  }
  if (s.symbol === "failed") {
    return `${ticker} could not be checked just now. Try again in a moment.`;
  }
  if (verdict && s.eligibility && !s.eligibility.ok) {
    return s.eligibility.reason;
  }
  if (!hasDirection) {
    return verdict
      ? `A verdict needs a direction. Long or short on ${ticker}?`
      : `A call needs a direction. Choose long, short or hold for ${ticker}.`;
  }
  if (verdict && s.direction === "hold") {
    return "A verdict is long or short. The market cannot settle a hold.";
  }
  if (verdict && !target) {
    return `A verdict needs a target price. It is what the market settles ${ticker} against.`;
  }
  if (target && !(Number(target) > 0)) {
    return `"${target}" is not a price. A target is a number, like 142.50.`;
  }
  if (verdict && !horizonInRange(s.horizon)) {
    return `A verdict's horizon is between ${VERDICT_HORIZON_MIN_DAYS} and ${VERDICT_HORIZON_MAX_DAYS} days.`;
  }
  return null;
}

export function advanceFor(type: PublicationType, key: StepKey, s: AdvanceInput): Advance {
  const role = roleOf(type, key);
  const go = (blocker: string | null = null): Advance => ({ label: "Continue", blocker });
  const done = (blocker: string | null = null): Advance => ({ label: "Done", blocker });
  const skip: Advance = { label: "Skip", blocker: null };

  switch (key) {
    case "video": {
      if (role === "feature") {
        if (!s.hasVideo) return skip;
        return done(videoBlockers(s));
      }
      if (!s.hasVideo) return go("Add a video first. Record one, or upload one.");
      const clip = videoBlockers(s);
      if (clip) return go(clip);
      // A video publication's headline lives under the clip, on this screen.
      if (headlineOnContent(type) && !s.title.trim()) {
        return go("Add a headline under the video. It is the line that travels.");
      }
      return go();
    }
    case "brief": {
      const text = s.briefText.trim();
      if (!text) return go("Write the take first. It is the whole publication.");
      if (text.length > s.briefMaxChars) {
        return go(`A brief is ${s.briefMaxChars} characters. This one is ${text.length}.`);
      }
      return go();
    }
    case "thesis": {
      const words = s.bodyText.trim();
      if (role === "feature") return words ? done() : skip;
      return words ? go() : go("Write the report first. A thesis with nothing in it is not one.");
    }
    case "call": {
      const empty = !s.ticker.trim() && !s.target.trim() && s.direction === null;
      if (role === "feature") {
        if (empty) return skip;
        return done(callBlockers(s, false));
      }
      return go(callBlockers(s, true));
    }
    case "cards": {
      if (s.cards.length === 0) return skip;
      const blank = s.cards.find((c) => c.empty);
      if (blank) return done(`The ${blank.name} card has nothing on it yet. Write it, or delete it.`);
      return done();
    }
    case "headline":
      return s.title.trim() ? go() : go("Add a headline first. It is the line that travels.");
    case "tags":
      return s.primaryTag ? go() : go("Choose a primary tag. It is where this sits in Explore.");
    case "publish":
      return go();
  }
}
