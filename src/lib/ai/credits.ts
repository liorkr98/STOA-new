/**
 * AI credit economics — DeepSeek V4-Pro (post-Graphify).
 *
 * List price: $1 → 100 credits ($0.01/credit).
 * Actual gross margin depends on action mix; see AI_ESTIMATED_COST_PER_CREDIT_USD.
 */

/** $1 wallet balance → credits purchased. */
export const AI_CREDITS_PER_DOLLAR = 100;

/** USD revenue per credit at list price. */
export const AI_PRICE_PER_CREDIT_USD = 1 / AI_CREDITS_PER_DOLLAR;

/**
 * Blended DeepSeek V4-Pro API cost per credit spent (USD), after Graphify.
 * Tuned to TOKEN_BUDGETS × list pricing ($0.435/M in, $0.87/M out).
 */
export const AI_ESTIMATED_COST_PER_CREDIT_USD = 0.00069;

/** Implied gross margin at list price and blended API cost. */
export const AI_EFFECTIVE_GROSS_MARGIN =
  1 - AI_ESTIMATED_COST_PER_CREDIT_USD / AI_PRICE_PER_CREDIT_USD;

/** Welcome grant — $5 equivalent at list price. */
export const WELCOME_AI_CREDITS = AI_CREDITS_PER_DOLLAR * 5;

export const AI_COST = {
  chat: 1,
  outline: 2,
  factCheck: 3,
  brandAnalyze: 2,
  template: 0,
  audioBrief: 3,
  diagram: 1,
} as const;

export type AiAction = keyof typeof AI_COST;

export function creditsForUsd(usd: number): number {
  return Math.floor(usd * AI_CREDITS_PER_DOLLAR);
}

/** Gross margin for a given API cost and credits charged (for diagnostics). */
export function grossMarginForSpend(apiCostUsd: number, creditsCharged: number): number {
  if (creditsCharged <= 0) return 0;
  const revenue = creditsCharged * AI_PRICE_PER_CREDIT_USD;
  if (revenue <= 0) return 0;
  return (revenue - apiCostUsd) / revenue;
}
