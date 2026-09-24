/**
 * The spine and the features menu.
 *
 * Every publication walks the same two-step spine: the content (a clip, a
 * take or a report, by type) with the headline on the same screen, then the
 * tags. After the spine comes the publish screen, and on it a menu of
 * optional features (a stance, cards, a thesis) that nobody has to
 * walk past: opening one goes into that feature's editor and Done brings you
 * back to the menu. Instagram's structure, not a wizard.
 *
 * The screens carry no explanatory copy. A heading, the work, one button.
 * The only sentences are refusals that name what is missing and the few
 * rules a creator would otherwise get wrong.
 *
 * The one-button rule from the old sequence survives: each screen has one
 * forward button whose label is what pressing it will do. On the spine it
 * reads Continue, and refuses with the reason when the step is not done. In
 * a feature editor it reads Skip when nothing has been added, Done when the
 * feature is complete, and Done that refuses and names what is missing when
 * it is half done. Partial information never passes.
 */

import type { PublicationType } from "@/lib/compose/modes";
import type { Direction } from "@/lib/types";

export type StepKey = "video" | "brief" | "thesis" | "stance" | "cards" | "tags" | "publish";

export type FeatureKey = "stance" | "cards" | "thesis";

export interface StepDef {
  key: StepKey;
  label: string;
  /**
   * One line under the heading, only where a screen needs a rule stated
   * (a live publication's read-only clip). Nothing else carries one.
   */
  blurb?: string;
}

const SPINE_STEPS: Record<Exclude<StepKey, "stance" | "cards" | "publish">, StepDef> = {
  video: { key: "video", label: "Video" },
  brief: { key: "brief", label: "The take" },
  thesis: { key: "thesis", label: "The report" },
  tags: { key: "tags", label: "Tags" },
};

export const PUBLISH_STEP: StepDef = { key: "publish", label: "Publish" };

/** The content step of each type's spine. */
export function contentStepFor(type: PublicationType): StepKey {
  switch (type) {
    case "video":
      return "video";
    case "brief":
      return "brief";
    case "thesis":
      return "thesis";
  }
}

/**
 * The mandatory steps, in order: the content, which carries the headline on
 * the same screen, then the tags. Two for every type. Never more.
 */
export function spineFor(type: PublicationType): StepDef[] {
  const content = SPINE_STEPS[contentStepFor(type) as keyof typeof SPINE_STEPS];
  return [content, SPINE_STEPS.tags];
}

export interface FeatureDef {
  key: FeatureKey;
  /** The menu row and the editor's heading: the feature's name and nothing more. */
  label: string;
}

const FEATURES: Record<FeatureKey, FeatureDef> = {
  stance: { key: "stance", label: "Stance" },
  cards: { key: "cards", label: "Cards" },
  thesis: { key: "thesis", label: "Thesis" },
};

/** What each type may add, in the order the menu lists them. */
export function featuresFor(type: PublicationType): FeatureDef[] {
  switch (type) {
    case "video":
      return [FEATURES.stance, FEATURES.cards, FEATURES.thesis];
    case "brief":
      return [FEATURES.stance, FEATURES.cards];
    case "thesis":
      return [FEATURES.stance, FEATURES.cards];
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
  if (feature) return { key, label: feature.label };
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
  hasBrief: boolean;
  hasThesis: boolean;
  /** A complete stance: a ticker and a direction. */
  hasStance: boolean;
  cardCount: number;
  hasTitle: boolean;
  hasTags: boolean;
  readyToPublish: boolean;
}

/**
 * A content step carries the headline, so it is done only with both. As a
 * feature (a thesis on a video) the same key is done with the feature alone;
 * the menu asks about the feature, not the line.
 */
export function stepState(key: StepKey, f: StepFacts, role: StepRole = "spine"): StepState {
  const line = role === "spine" ? f.hasTitle : true;
  switch (key) {
    case "video":
      return f.hasVideo && line ? "done" : "empty";
    case "brief":
      return f.hasBrief && line ? "done" : "empty";
    case "thesis":
      return f.hasThesis && line ? "done" : "empty";
    case "stance":
      return f.hasStance ? "done" : "empty";
    case "cards":
      return f.cardCount > 0 ? "done" : "empty";
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
   * it will. Specific on purpose: "a direction needs a ticker", never
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
  /** Null until the creator has chosen one. A stance is a ticker and a direction. */
  direction: Direction | null;
  /**
   * Whether the ticker in the field is a real name. "checking" while the
   * answer is on its way; "frozen" for a live publication, whose stance was
   * checked when it went out and cannot change now.
   */
  symbol: "idle" | "checking" | "found" | "missing" | "failed" | "frozen";
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
 * A stance's blockers, in the order the creator would fix them: the ticker
 * first, because a direction means nothing without it.
 */
function stanceBlockers(s: AdvanceInput): string | null {
  const ticker = s.ticker.trim().toUpperCase();
  if (s.symbol === "frozen") return null;
  if (!ticker) return "A direction needs a ticker. Add the ticker, or clear the direction.";
  if (s.symbol === "checking") {
    return `Still checking ${ticker}. Give it a second, then press again.`;
  }
  if (s.symbol === "missing") {
    return `${ticker} was not found. Check the symbol, or clear it.`;
  }
  if (s.symbol === "failed") {
    return `${ticker} could not be checked just now. Try again in a moment.`;
  }
  if (s.direction === null) return `Choose long, short or hold for ${ticker}.`;
  return null;
}

export function advanceFor(type: PublicationType, key: StepKey, s: AdvanceInput): Advance {
  const role = roleOf(type, key);
  const go = (blocker: string | null = null): Advance => ({ label: "Continue", blocker });
  const done = (blocker: string | null = null): Advance => ({ label: "Done", blocker });
  const skip: Advance = { label: "Skip", blocker: null };
  // The headline lives on every content screen, and is asked for once the
  // content itself is in: the content is what the screen is for.
  const headline = (where: string): Advance =>
    s.title.trim() ? go() : go(`Add a headline ${where}.`);

  switch (key) {
    case "video": {
      if (!s.hasVideo) return go("Add a video first. Record one, or upload one.");
      const clip = videoBlockers(s);
      if (clip) return go(clip);
      return headline("under the video");
    }
    case "brief": {
      const text = s.briefText.trim();
      if (!text) return go("Write the take first.");
      if (text.length > s.briefMaxChars) {
        return go(`A brief is ${s.briefMaxChars} characters. This one is ${text.length}.`);
      }
      return headline("above the take");
    }
    case "thesis": {
      const words = s.bodyText.trim();
      if (role === "feature") return words ? done() : skip;
      if (!words) return go("Write the report first.");
      return headline("above the report");
    }
    case "stance": {
      if (!s.ticker.trim() && s.direction === null) return skip;
      return done(stanceBlockers(s));
    }
    case "cards": {
      if (s.cards.length === 0) return skip;
      const blank = s.cards.find((c) => c.empty);
      if (blank) return done(`The ${blank.name} card has nothing on it yet. Write it, or delete it.`);
      return done();
    }
    case "tags":
      return s.primaryTag ? go() : go("Choose a primary tag.");
    case "publish":
      return go();
  }
}
