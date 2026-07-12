import "server-only";
import { createOpenAI } from "@ai-sdk/openai";

/** DeepSeek OpenAI-compatible Chat Completions base (SDK appends /chat/completions). */
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

/** Prefer flash for compose/JSON; override with DEEPSEEK_MODEL on Vercel. */
export const DEFAULT_LLM_MODEL = "deepseek-v4-flash";

const MODEL_ALIASES: Record<string, string> = {
  "deepseek-v4": "deepseek-v4-flash",
  "deepseek-chat": "deepseek-v4-flash",
  "deepseek-reasoner": "deepseek-v4-flash",
  "deepseek-v3": "deepseek-v4-flash",
  "deepseek-v3.2": "deepseek-v4-flash",
};

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
  const id = raw.replace(/[\x00-\x1f\x7f]/g, "").trim().toLowerCase();
  if (!id) return DEFAULT_LLM_MODEL;
  return MODEL_ALIASES[id] ?? id;
}

/**
 * DeepSeek V4 enables thinking by default. Structured compose/fact-check need
 * non-thinking JSON. Inject thinking.disabled and soften tool_choice on every body.
 */
function deepseekFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!init?.body || typeof init.body !== "string") {
    return fetch(input, init);
  }
  try {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    body.thinking = { type: "disabled" };
    if (body.tool_choice === "required" || (body.tool_choice && typeof body.tool_choice === "object")) {
      body.tool_choice = "auto";
    }
    return fetch(input, {
      ...init,
      body: JSON.stringify(body),
    });
  } catch {
    return fetch(input, init);
  }
}

/**
 * Fresh provider each call. Must use `.chat()` — the default `provider(model)`
 * hits OpenAI's `/responses` API, which DeepSeek does not implement (404 Not Found).
 */
export function llmModel() {
  const key = llmApiKey();
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");

  const deepseek = createOpenAI({
    apiKey: key,
    baseURL: DEEPSEEK_BASE_URL,
    name: "deepseek",
    fetch: deepseekFetch,
  });
  return deepseek.chat(llmModelId());
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
