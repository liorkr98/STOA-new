/** AI credit costs and conversion rate (mirrors legacy STOA economics). */

export const AI_CREDITS_PER_DOLLAR = 10;
export const WELCOME_AI_CREDITS = 50;

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
