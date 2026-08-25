/**
 * Promotion, with the price left out on purpose.
 *
 * The cost model is not decided. What is decided is everything around it:
 * promotion is a switch on a publication, it can be turned on when the
 * publication is composed or at any time afterwards from the published item,
 * and promoted content is always labelled as promoted. Those are the parts
 * built here.
 *
 * The old fixed Boost packages (`src/lib/profile/boost-packages.ts`, four
 * hardcoded durations and prices) are deliberately not referenced. Pricing
 * arrives as a `PromoteModel` from wherever it ends up being decided, and the
 * interface renders whatever it is handed, including nothing.
 */

export interface PromoteOption {
  id: string;
  label: string;
  /** Preformatted, because the unit is undecided: credits, dollars, a bid. */
  costLabel: string;
  detail?: string;
}

export interface PromoteModel {
  /** Named so a stored selection can be read back against the model that made it. */
  id: string;
  options: PromoteOption[];
  /** Shown in place of the options while the model is still being decided. */
  placeholder?: string;
}

/**
 * What ships until pricing exists: the switch, the label rule, and an honest
 * statement that the cost is not set. No option is selectable, so nothing can
 * be sold at a price nobody has agreed.
 */
export const UNPRICED_PROMOTE_MODEL: PromoteModel = {
  id: "unpriced",
  options: [],
  placeholder: "Pricing is not set yet. Turn this on and we will confirm the cost before anything is charged.",
};

export interface PromoteState {
  /** The creator asked for this publication to be promoted. */
  boostOnPublish: boolean;
  /** Which option of `modelId`, when the model has any. */
  optionId: string | null;
  /** The model the choice was made against, so a repriced model never silently reinterprets it. */
  modelId: string | null;
}

export const EMPTY_PROMOTE: PromoteState = {
  boostOnPublish: false,
  optionId: null,
  modelId: null,
};

/** The rule that does not depend on pricing: promoted content says so. */
export const PROMOTED_LABEL = "Promoted";

export function isPromoteConfigured(state: PromoteState, model: PromoteModel): boolean {
  if (!state.boostOnPublish) return false;
  if (model.options.length === 0) return true;
  return Boolean(state.optionId);
}
