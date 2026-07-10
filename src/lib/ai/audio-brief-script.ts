import "server-only";
import { generateText } from "ai";
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

function bodyExcerpt(body: string | null): string {
  if (!body?.trim()) return "";
  try {
    if (isTiptapDoc(body)) return tiptapPlainText(parseTiptapDoc(body)).slice(0, 1_200);
    return body.slice(0, 1_200);
  } catch {
    return body.slice(0, 1_200);
  }
}

function fallbackScript(source: AudioBriefSource): string {
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
  const excerpt = bodyExcerpt(source.body);
  if (excerpt) parts.push(excerpt);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 900);
}

const AUDIO_BRIEF_SYSTEM = `You write spoken audio briefs for equity research. Output plain text only — no markdown.
Keep it under 150 words (~60 seconds when read aloud). Cover thesis, ticker, direction/target if present, and one key risk.`;

/** Build a ~60s spoken script from report fields. Uses DeepSeek when configured. */
export async function buildAudioBriefScript(source: AudioBriefSource): Promise<string> {
  const context = [
    source.title ? `Title: ${source.title}` : "",
    source.summary ? `Summary: ${source.summary}` : "",
    source.ticker ? `Ticker: ${source.ticker}` : "",
    source.prediction
      ? `Call: ${source.prediction.direction}, target $${source.prediction.target_price ?? "n/a"}`
      : "",
    bodyExcerpt(source.body) ? `Body excerpt: ${bodyExcerpt(source.body)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!hasLlmApiKey() || !context.trim()) {
    const script = fallbackScript(source);
    if (!script) throw new Error("Add a title or summary before generating an audio brief.");
    return script;
  }

  const { text } = await generateText({
    model: llmModel(),
    system: AUDIO_BRIEF_SYSTEM,
    prompt: context,
    temperature: 0.5,
    maxOutputTokens: 400,
  });

  const script = text.trim() || fallbackScript(source);
  if (!script) throw new Error("Could not build audio brief script.");
  return script.slice(0, 1_200);
}
