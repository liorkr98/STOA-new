import "server-only";
import { createOpenAI } from "@ai-sdk/openai";

/** DeepSeek OpenAI-compatible API (https://api.deepseek.com). */
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

export const DEFAULT_LLM_MODEL = "deepseek-v4-pro";

export function llmApiKey(): string | undefined {
  const raw = process.env.DEEPSEEK_API_KEY;
  if (!raw) return undefined;
  return raw.replace(/[\x00-\x1f\x7f]/g, "").trim() || undefined;
}

export function hasLlmApiKey(): boolean {
  return Boolean(llmApiKey());
}

export function llmModelId(): string {
  const raw = process.env.DEEPSEEK_MODEL;
  if (!raw) return DEFAULT_LLM_MODEL;
  return raw.replace(/[\x00-\x1f\x7f]/g, "").trim() || DEFAULT_LLM_MODEL;
}

const deepseek = createOpenAI({
  apiKey: llmApiKey(),
  baseURL: DEEPSEEK_BASE_URL,
  name: "deepseek",
});

/** Vercel AI SDK model instance for compose, diagrams, and other structured generation. */
export function llmModel() {
  return deepseek(llmModelId());
}

/** Raw OpenAI-compatible chat completions endpoint (legacy fetch callers). */
export function llmChatCompletionsUrl(): string {
  return `${DEEPSEEK_BASE_URL}/chat/completions`;
}

export function llmAuthHeaders(): Record<string, string> {
  const key = llmApiKey();
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}
