import type { AiAction } from "@/lib/ai/credits";
import { AI_COST } from "@/lib/ai/credits";

/** Rough token estimate (~4 chars/token for English prose). */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export interface TokenBudget {
  /** Input tokens included in the base credit price. */
  soft: number;
  /** Hard cap after Graphify compression — never send more than this. */
  hard: number;
  /** Suggested max completion tokens for the model call. */
  maxOutput: number;
}

/** Per-task input/output token budgets (tuned for DeepSeek cost efficiency). */
export const TOKEN_BUDGETS: Record<AiAction, TokenBudget> = {
  chat: { soft: 1_200, hard: 2_000, maxOutput: 500 },
  outline: { soft: 1_500, hard: 2_500, maxOutput: 700 },
  factCheck: { soft: 2_000, hard: 3_500, maxOutput: 900 },
  brandAnalyze: { soft: 400, hard: 800, maxOutput: 400 },
  diagram: { soft: 350, hard: 600, maxOutput: 350 },
  template: { soft: 0, hard: 0, maxOutput: 0 },
  audioBrief: { soft: 800, hard: 1_200, maxOutput: 400 },
  // Reads the whole thesis and argues against it, so it carries the largest
  // input budget and the longest answer of any compose tool.
  devilsAdvocate: { soft: 2_500, hard: 4_000, maxOutput: 1_100 },
};

/** +1 credit per 1k input tokens above the soft budget (after Graphify). */
export const TOKEN_SURCHARGE_PER_1K = 1;

export interface TokenUsageQuote {
  inputTokens: number;
  outputBudget: number;
  baseCredits: number;
  surchargeCredits: number;
  totalCredits: number;
}

export function quoteCredits(action: AiAction, inputTokens: number): TokenUsageQuote {
  const base = AI_COST[action];
  const budget = TOKEN_BUDGETS[action];
  const over = Math.max(0, inputTokens - budget.soft);
  const surcharge = base > 0 ? Math.ceil(over / 1_000) * TOKEN_SURCHARGE_PER_1K : 0;

  return {
    inputTokens,
    outputBudget: budget.maxOutput,
    baseCredits: base,
    surchargeCredits: surcharge,
    totalCredits: base + surcharge,
  };
}

export interface LlmUsageRecord {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Merge AI SDK usage with our pre-call estimate for API responses. */
export function mergeUsage(
  estimatedInput: number,
  sdkUsage?: LlmUsageRecord,
): { estimated_input: number; actual?: LlmUsageRecord; tokens_saved?: number } {
  const actualPrompt = sdkUsage?.promptTokens;
  return {
    estimated_input: estimatedInput,
    ...(sdkUsage ? { actual: sdkUsage } : {}),
    ...(actualPrompt != null && actualPrompt < estimatedInput
      ? { tokens_saved: estimatedInput - actualPrompt }
      : {}),
  };
}
