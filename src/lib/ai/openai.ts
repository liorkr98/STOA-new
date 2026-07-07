import "server-only";
import { createOpenAI } from "@ai-sdk/openai";

/** Vercel AI SDK OpenAI provider (server-only). */
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function openaiModel() {
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}
