import "server-only";

import { listSymbolNames } from "@/lib/db/tickers";
import { videoTickerIndex } from "@/lib/db/video-ticker-index";
import { DETECT_MODEL, readMentions } from "@/lib/extension/detect/model";
import { createResolver, type Resolver } from "@/lib/extension/detect/resolve";
import { applyRules } from "@/lib/extension/detect/rules";
import type { DetectRequest, VideoTickerIndex } from "@/lib/extension/types";

let resolver: { at: number; resolve: Resolver } | null = null;

async function currentResolver(): Promise<Resolver> {
  if (resolver && Date.now() - resolver.at < 12 * 60 * 60 * 1000) return resolver.resolve;
  resolver = { at: Date.now(), resolve: createResolver(await listSymbolNames()) };
  return resolver.resolve;
}

/** Two viewers opening the same new video at once share one AI read. */
const inFlight = new Map<string, Promise<VideoTickerIndex>>();

export async function cachedVideo(videoId: string): Promise<VideoTickerIndex | null> {
  return videoTickerIndex().get(videoId);
}

/** The video's tickers: the stored answer when there is one, otherwise read now and stored. */
export async function detectVideo(req: DetectRequest): Promise<{ entry: VideoTickerIndex; cached: boolean }> {
  const hit = await videoTickerIndex().get(req.videoId);
  if (hit) return { entry: hit, cached: true };
  let job = inFlight.get(req.videoId);
  if (!job) {
    job = (async () => {
      const [mentions, resolve] = await Promise.all([readMentions(req), currentResolver()]);
      const entry: VideoTickerIndex = {
        videoId: req.videoId,
        language: req.language,
        items: applyRules(mentions, resolve),
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
