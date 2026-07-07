import { normalizePromptInput } from "@/lib/ai/prompt-safety";
import { estimateTokens } from "@/lib/ai/token-economy";

const WHITESPACE_RE = /\s+/g;
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z0-9"($])/;

const FINANCE_KEYWORDS_RE =
  /\b(revenue|earnings|eps|margin|growth|catalyst|risk|thesis|target|support|resistance|valuation|dcf|guidance|outlook|bear|bull|upgrade|downgrade|consensus|dividend|buyback|guidance|yoy|qoq|beat|miss)\b/i;
const TICKER_RE = /\$?[A-Z]{1,5}\b/;
const MONEY_RE = /\$[\d,]+(?:\.\d{1,2})?/;
const PCT_RE = /\d+(?:\.\d+)?%/;

export type GraphifyTask = "diagram" | "compose" | "factCheck" | "brand" | "napkin" | "chart";

export interface GraphifyResult {
  text: string;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  excerptCount: number;
}

function collapseWhitespace(text: string): string {
  return text.replace(WHITESPACE_RE, " ").trim();
}

function splitSentences(text: string): string[] {
  const parts = text.split(SENTENCE_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20);
}

function scoreSentence(sentence: string, task: GraphifyTask): number {
  let score = 0;
  if (MONEY_RE.test(sentence)) score += 4;
  if (PCT_RE.test(sentence)) score += 3;
  if (TICKER_RE.test(sentence)) score += 2;
  if (FINANCE_KEYWORDS_RE.test(sentence)) score += 2;
  if (/\b(chart|diagram|visual|level|price)\b/i.test(sentence)) score += task === "diagram" || task === "chart" ? 3 : 1;
  if (/\b(I believe|we expect|likely|could|should)\b/i.test(sentence)) {
    score += task === "factCheck" ? 2 : 0.5;
  }
  score += Math.min(sentence.length / 120, 1.5);
  return score;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

/**
 * Graphify — compress analyst prose to the highest-signal excerpts before
 * sending to DeepSeek. No extra LLM call; pure deterministic extraction.
 */
export function graphifyText(
  raw: string,
  task: GraphifyTask,
  maxTokens: number,
  maxChars?: number,
): GraphifyResult {
  const normalized = collapseWhitespace(normalizePromptInput(raw, maxChars ?? maxTokens * 8));
  const tokensBefore = estimateTokens(normalized);

  if (!normalized || tokensBefore <= maxTokens) {
    return {
      text: normalized,
      tokensBefore,
      tokensAfter: tokensBefore,
      tokensSaved: 0,
      excerptCount: normalized ? 1 : 0,
    };
  }

  const sentences = dedupeLines(splitSentences(normalized));
  const ranked = sentences
    .map((sentence, index) => ({ sentence, score: scoreSentence(sentence, task), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const picked: { sentence: string; index: number }[] = [];
  let usedTokens = 0;

  for (const row of ranked) {
    const sentenceTokens = estimateTokens(row.sentence);
    if (usedTokens + sentenceTokens > maxTokens) continue;
    picked.push({ sentence: row.sentence, index: row.index });
    usedTokens += sentenceTokens;
    if (usedTokens >= maxTokens * 0.92) break;
  }

  if (picked.length === 0) {
    const fallback = normalized.slice(0, maxTokens * 4);
    const tokensAfter = estimateTokens(fallback);
    return {
      text: fallback,
      tokensBefore,
      tokensAfter,
      tokensSaved: Math.max(0, tokensBefore - tokensAfter),
      excerptCount: 1,
    };
  }

  picked.sort((a, b) => a.index - b.index);
  const text = picked.map((p) => p.sentence).join(" ");
  const tokensAfter = estimateTokens(text);

  return {
    text,
    tokensBefore,
    tokensAfter,
    tokensSaved: Math.max(0, tokensBefore - tokensAfter),
    excerptCount: picked.length,
  };
}

/** Trim chart/diagram prompts: keep structured header, graphify only the analyst note. */
export function graphifyChartNote(analystNote: string, maxTokens = 250): GraphifyResult {
  return graphifyText(analystNote, "chart", maxTokens, maxTokens * 4);
}
