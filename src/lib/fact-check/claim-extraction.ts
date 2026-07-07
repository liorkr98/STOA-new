/**
 * Claim decomposition — step 1 of the fact-checker pipeline.
 */
import { generateObject } from "ai";
import { z } from "zod";
import { FACT_CHECK_SYSTEM_PROMPT, preparePromptText } from "@/lib/ai/graphify";
import { hasLlmApiKey, llmModel } from "@/lib/ai/llm";
import { escapePromptTagContent, normalizePromptInput } from "@/lib/ai/prompt-safety";
import { TOKEN_BUDGETS } from "@/lib/ai/token-economy";

export type ClaimType = "Fact" | "Opinion" | "Misleading" | "Unverified" | "Yahoo-Verified" | "Yahoo-Disputed";

export interface RawClaim {
  text: string;
  type: ClaimType;
  note?: string;
  confidence?: "high" | "medium" | "low";
  verifiableTicker?: string | null;
  verifiableMetric?: string | null;
}

const ClaimSchema = z.object({
  text: z.string(),
  type: z.enum(["Fact", "Opinion", "Misleading", "Unverified"]),
  note: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  verifiableTicker: z.string().nullable().optional(),
  verifiableMetric: z
    .enum(["price", "revenue", "marketCap", "eps", "peRatio"])
    .nullable()
    .optional(),
});

const ClaimsResponseSchema = z.object({
  claims: z.array(ClaimSchema).min(1).max(10),
});

function mockClaims(text: string): RawClaim[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
  return sentences.slice(0, 5).map((s, i) => ({
    text: s.slice(0, 200),
    type: i % 3 === 0 ? "Opinion" : "Unverified",
    note: "Add DEEPSEEK_API_KEY for full AI classification.",
    confidence: "medium" as const,
  }));
}

/** Extracts and classifies atomic claims from report text via DeepSeek (Graphify-compressed). */
export async function extractClaims(reportText: string): Promise<RawClaim[]> {
  const normalizedReportText = normalizePromptInput(reportText, 24_000);
  if (!hasLlmApiKey()) return mockClaims(normalizedReportText);

  const prepared = preparePromptText("factCheck", normalizedReportText);
  const wrappedReportText = escapePromptTagContent(prepared.text);

  try {
    const { object } = await generateObject({
      model: llmModel(),
      system: FACT_CHECK_SYSTEM_PROMPT,
      prompt: `<report_text>\n${wrappedReportText}\n</report_text>`,
      schema: ClaimsResponseSchema,
      temperature: 0,
      maxOutputTokens: TOKEN_BUDGETS.factCheck.maxOutput,
    });

    return object.claims as RawClaim[];
  } catch {
    return mockClaims(prepared.text || normalizedReportText);
  }
}

/** Token quote for fact-check spend (call before extractClaims in the route). */
export function quoteFactCheckInput(reportText: string) {
  const normalized = normalizePromptInput(reportText, 24_000);
  return preparePromptText("factCheck", normalized);
}
