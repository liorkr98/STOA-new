import type { AiAction } from "@/lib/ai/credits";
import { TOKEN_BUDGETS, estimateTokens, quoteCredits, type TokenUsageQuote } from "@/lib/ai/token-economy";
import { graphifyChartNote, graphifyText, type GraphifyResult, type GraphifyTask } from "./compress";

export { graphifyChartNote, graphifyText, type GraphifyResult, type GraphifyTask };
export {
  BRAND_SYSTEM_PROMPT,
  COMPOSE_ACTIONS_COMPACT,
  COMPOSE_SYSTEM_RULES,
  DIAGRAM_SYSTEM_PROMPT,
  FACT_CHECK_SYSTEM_PROMPT,
} from "./prompts";

const TASK_FOR_ACTION: Partial<Record<AiAction, GraphifyTask>> = {
  diagram: "diagram",
  chat: "compose",
  outline: "compose",
  factCheck: "factCheck",
  brandAnalyze: "brand",
};

export interface PreparedPrompt {
  text: string;
  graphify: GraphifyResult;
  quote: TokenUsageQuote;
}

/** Run Graphify compression then quote credits for a single text payload. */
export function preparePromptText(
  action: AiAction,
  raw: string,
  options?: { task?: GraphifyTask; maxTokens?: number },
): PreparedPrompt {
  const task = options?.task ?? TASK_FOR_ACTION[action] ?? "compose";
  const budget = TOKEN_BUDGETS[action];
  const maxTokens = options?.maxTokens ?? budget.hard;
  const graphify = graphifyText(raw, task, maxTokens);
  const quote = quoteCredits(action, graphify.tokensAfter);

  return { text: graphify.text, graphify, quote };
}

/** Compose context: prefer selection; graphify document only when needed. */
export function prepareComposeContext(input: {
  documentExcerpt?: string;
  selection?: string;
  title?: string;
  dek?: string;
  ticker?: string;
  type?: string;
}): {
  document?: string;
  selection?: string;
  meta: { title?: string; dek?: string; ticker?: string; type?: string };
  graphify: { document?: GraphifyResult; selection?: GraphifyResult };
  inputTokens: number;
  quote: TokenUsageQuote;
} {
  const meta = {
    title: input.title,
    dek: input.dek,
    ticker: input.ticker,
    type: input.type,
  };

  let document: string | undefined;
  let selection: string | undefined;
  const graphifyMeta: { document?: GraphifyResult; selection?: GraphifyResult } = {};

  if (input.selection?.trim()) {
    const g = graphifyText(input.selection, "compose", 500);
    selection = g.text;
    graphifyMeta.selection = g;
  }

  if (input.documentExcerpt?.trim()) {
    const docBudget = selection ? 400 : TOKEN_BUDGETS.chat.hard;
    const g = graphifyText(input.documentExcerpt, "compose", docBudget);
    document = g.text;
    graphifyMeta.document = g;
  }

  const payload = [document, selection, meta.title, meta.dek, meta.ticker, meta.type].filter(Boolean).join("\n");
  const inputTokens = estimateTokens(payload);
  const quote = quoteCredits("chat", inputTokens);

  return { document, selection, meta, graphify: graphifyMeta, inputTokens, quote };
}
