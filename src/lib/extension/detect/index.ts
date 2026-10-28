import "server-only";

import { listSymbolNames } from "@/lib/db/tickers";
import { videoTickerIndex } from "@/lib/db/video-ticker-index";
import { costUsd, estimateUsd, logCost, recordSpend, withinBudget } from "@/lib/extension/detect/budget";
import { DETECT_MAX_TOKENS, DETECT_MODEL, readMentions, transcriptChars } from "@/lib/extension/detect/model";
import { createResolver, type Resolver } from "@/lib/extension/detect/resolve";
import { applyRules, mergeReads, type Mention } from "@/lib/extension/detect/rules";

/** Independent AI reads per new video, merged (`mergeReads`). */
const READS = 2;
import type { DetectRequest, VideoTickerIndex } from "@/lib/extension/types";

let resolver: { at: number; resolve: Resolver } | null = null;

async function currentResolver(): Promise<Resolver> {
  if (resolver && Date.now() - resolver.at < 12 * 60 * 60 * 1000) return resolver.resolve;
  resolver = { at: Date.now(), resolve: createResolver(await listSymbolNames()) };
  return resolver.resolve;
}

/**
 * The AI reads each line's start time only, so a stretch it reports ends
 * where its last line starts. Stretched here to where that line ends.
 */
export function toLineEnds(mentions: Mention[], segments: DetectRequest["segments"]): Mention[] {
  return mentions.map((m) => {
    let end = m.end_seconds;
    for (const s of segments) {
      if (s.start > m.end_seconds) break;
      if (s.start >= m.start_seconds - 1) end = Math.max(end, s.end);
    }
    return { ...m, end_seconds: end };
  });
}

/** Two viewers opening the same new video at once share one AI read. */
const inFlight = new Map<string, Promise<VideoTickerIndex>>();

export async function cachedVideo(videoId: string): Promise<VideoTickerIndex | null> {
  return videoTickerIndex().get(videoId);
}

/** Today's spending cap is reached: no new AI reads until midnight UTC; stored answers still served. */
export class DetectionPaused extends Error {}

/** The video's tickers: the stored answer when there is one, otherwise read now and stored. */
export async function detectVideo(req: DetectRequest, userId: string): Promise<{ entry: VideoTickerIndex; cached: boolean }> {
  const hit = await videoTickerIndex().get(req.videoId);
  if (hit) return { entry: hit, cached: true };
  let job = inFlight.get(req.videoId);
  if (!job) {
    if (!(await withinBudget(READS * estimateUsd(transcriptChars(req), DETECT_MAX_TOKENS)))) {
      throw new DetectionPaused("Today's detection budget is used up");
    }
    job = (async () => {
      // Two independent reads, merged by agreement (`mergeReads`): one read
      // alone changed its answer on about one ticker in ten between runs.
      const [settled, resolve] = await Promise.all([Promise.allSettled(Array.from({ length: READS }, () => readMentions(req))), currentResolver()]);
      // One failed read (a timeout, an answer cut short) leaves the other to stand alone.
      const reads = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      for (const r of settled) if (r.status === "rejected") console.error(`[detect] ${req.videoId} read failed`, r.reason);
      if (reads.length === 0) throw (settled[0] as PromiseRejectedResult).reason;
      const inputTokens = reads.reduce((n, r) => n + r.inputTokens, 0);
      const outputTokens = reads.reduce((n, r) => n + r.outputTokens, 0);
      const usd = reads.reduce((n, r) => n + costUsd(r.inputTokens, r.outputTokens), 0);
      const dayTotal = await recordSpend(usd);
      await logCost({ videoId: req.videoId, userId, inputTokens, outputTokens, usd, dayTotal, at: new Date().toISOString() });
      const segments = [...req.segments].sort((a, b) => a.start - b.start);
      const lists = reads.map((r, i) => {
        if (process.env.NODE_ENV === "development") console.info(`[detect] ${req.videoId} read ${i + 1}`, JSON.stringify(r.mentions));
        return applyRules(toLineEnds(r.mentions, segments), resolve);
      });
      const entry: VideoTickerIndex = {
        videoId: req.videoId,
        language: req.language,
        // With one read lost (a timeout), the other stands alone.
        items: lists.length > 1 ? lists.reduce((merged, list) => mergeReads(merged, list)) : lists[0]!,
        model: DETECT_MODEL,
        detectedAt: new Date().toISOString(),
      };
      await videoTickerIndex().put(entry);
      return entry;
    })().finally(() => inFlight.delete(req.videoId));
    inFlight.set(req.videoId, job);
  }
  return { entry: await job, cached: false };
}
