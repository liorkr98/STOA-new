import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getRedis } from "@/lib/redis";

/**
 * The daily spending cap on AI reads. DETECT_DAILY_BUDGET_USD (default 5)
 * caps what new reads may cost per UTC day across all readers; once reached,
 * new reads stop until midnight UTC and stored results are still served.
 * The total lives in Redis when configured (shared by every server
 * instance), otherwise in this instance's memory.
 */
export const DEFAULT_DAILY_BUDGET_USD = 5;

/** Claude Haiku 5.5, per million tokens, prompts up to 100K tokens (beyond: 0.50 / 2.50). */
const PRICE = { input: 0.1, output: 0.5, longInput: 0.5, longOutput: 2.5, longFrom: 100_000 };

export function dailyBudgetUsd(): number {
  const raw = Number(process.env.DETECT_DAILY_BUDGET_USD);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_DAILY_BUDGET_USD;
}

export function costUsd(inputTokens: number, outputTokens: number): number {
  const long = inputTokens > PRICE.longFrom;
  return (inputTokens * (long ? PRICE.longInput : PRICE.input) + outputTokens * (long ? PRICE.longOutput : PRICE.output)) / 1_000_000;
}

/** A cautious guess before the call: about one token per three characters, plus the instructions, and the longest answer allowed. */
export function estimateUsd(transcriptChars: number, maxOutputTokens: number): number {
  return costUsd(Math.ceil(transcriptChars / 3) + 1_500, maxOutputTokens);
}

const day = (now = new Date()) => now.toISOString().slice(0, 10);
const KEY = (d: string) => `detect-spend:${d}`;
const memory = new Map<string, number>();

export async function spentToday(): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      return Number((await redis.get<number | string>(KEY(day()))) ?? 0);
    } catch {
      /* fall back to this instance's count */
    }
  }
  return memory.get(day()) ?? 0;
}

/** Whether a read that may cost `estimate` still fits today's cap. */
export async function withinBudget(estimate: number): Promise<boolean> {
  return (await spentToday()) + estimate <= dailyBudgetUsd();
}

export async function recordSpend(usd: number): Promise<number> {
  const d = day();
  memory.set(d, (memory.get(d) ?? 0) + usd);
  const redis = getRedis();
  if (redis) {
    try {
      const total = Number(await redis.incrbyfloat(KEY(d), usd));
      await redis.expire(KEY(d), 3 * 86_400);
      return total;
    } catch {
      /* the memory count still stands */
    }
  }
  return memory.get(d) ?? usd;
}

export type CostLine = { videoId: string; userId: string; inputTokens: number; outputTokens: number; usd: number; dayTotal: number; at: string };

/**
 * One line per AI read in the server log, and on a developer's machine also
 * in .next/cache/stoa-detect-costs.jsonl. Never the transcript.
 */
export async function logCost(line: CostLine): Promise<void> {
  console.info(`[detect-cost] ${line.videoId} in=${line.inputTokens} out=${line.outputTokens} $${line.usd.toFixed(5)} today=$${line.dayTotal.toFixed(4)}`);
  if (process.env.NODE_ENV !== "development") return;
  try {
    const dir = path.join(process.cwd(), ".next", "cache");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "stoa-detect-costs.jsonl"), `${JSON.stringify(line)}\n`);
  } catch {
    /* the console line is enough */
  }
}
