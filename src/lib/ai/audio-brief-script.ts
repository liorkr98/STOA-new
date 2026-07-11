import "server-only";
import { generateText } from "ai";
import type { AudioBriefMode } from "@/lib/ai/audio/pricing";
import { hasLlmApiKey, llmModel } from "@/lib/ai/llm";
import { tiptapPlainText, parseTiptapDoc, isTiptapDoc } from "@/lib/editor/tiptap/serialize";

export interface AudioBriefSource {
  title: string | null;
  summary: string | null;
  ticker: string | null;
  body: string | null;
  prediction?: {
    direction: string;
    target_price: number | null;
    horizon_date?: string | null;
  } | null;
}

export function bodyPlainText(body: string | null, maxChars?: number): string {
  if (!body?.trim()) return "";
  let plain = "";
  try {
    plain = isTiptapDoc(body) ? tiptapPlainText(parseTiptapDoc(body)) : body;
  } catch {
    plain = body;
  }
  plain = plain.replace(/\s+/g, " ").trim();
  if (maxChars != null) return plain.slice(0, maxChars);
  return plain;
}

function fallbackScript(source: AudioBriefSource, mode: AudioBriefMode): string {
  const maxBody =
    mode === "brief" ? 900 : mode === "extended" ? 4_000 : 12_000;
  const parts: string[] = [];
  if (source.title) parts.push(source.title);
  if (source.summary) parts.push(source.summary);
  if (source.ticker) parts.push(`Ticker ${source.ticker}.`);
  const p = source.prediction;
  if (p?.direction && p.target_price != null) {
    parts.push(
      `${p.direction.charAt(0).toUpperCase()}${p.direction.slice(1)} call with a target of $${p.target_price}.`,
    );
  }
  const excerpt = bodyPlainText(source.body, maxBody);
  if (excerpt) parts.push(excerpt);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxBody);
}

const MODE_PROMPTS: Record<AudioBriefMode, string> = {
  brief:
    "Keep it under 150 words (~60 seconds spoken). Cover thesis, ticker, direction/target if present, and one key risk.",
  extended:
    "Write a 3–5 minute spoken brief (~500–800 words). Cover thesis, catalysts, valuation, the call, and two risks.",
  full:
    "Write a full spoken narration of the research (~8–15 minutes when read aloud). Walk through thesis, evidence, valuation, risks, and the locked call. Use clear section transitions.",
};

const AUDIO_BRIEF_SYSTEM = `You write spoken audio briefs for equity research. Output plain text only — no markdown.`;

/** Build spoken script from report fields. Uses DeepSeek when configured. */
export async function buildAudioBriefScript(
  source: AudioBriefSource,
  mode: AudioBriefMode = "brief",
): Promise<string> {
  const bodyExcerpt = bodyPlainText(
    source.body,
    mode === "brief" ? 1_200 : mode === "extended" ? 8_000 : 20_000,
  );

  const context = [
    source.title ? `Title: ${source.title}` : "",
    source.summary ? `Summary: ${source.summary}` : "",
    source.ticker ? `Ticker: ${source.ticker}` : "",
    source.prediction
      ? `Call: ${source.prediction.direction}, target $${source.prediction.target_price ?? "n/a"}`
      : "",
    bodyExcerpt ? `Body: ${bodyExcerpt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const maxChars =
    mode === "brief" ? 1_200 : mode === "extended" ? 5_500 : 16_000;
  const maxOutputTokens =
    mode === "brief" ? 400 : mode === "extended" ? 1_200 : 3_500;

  if (!hasLlmApiKey() || !context.trim()) {
    const script = fallbackScript(source, mode);
    if (!script) throw new Error("Add a title or summary before generating an audio brief.");
    return script;
  }

  const { text } = await generateText({
    model: llmModel(),
    system: `${AUDIO_BRIEF_SYSTEM}\n${MODE_PROMPTS[mode]}`,
    prompt: context,
    temperature: 0.5,
    maxOutputTokens,
  });

  const script = text.trim() || fallbackScript(source, mode);
  if (!script) throw new Error("Could not build audio brief script.");
  return script.slice(0, maxChars);
}
