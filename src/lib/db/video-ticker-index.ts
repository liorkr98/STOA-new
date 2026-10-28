import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { VideoTickerIndex } from "@/lib/extension/types";

/** A video's tickers are worked out again after this long. */
export const VIDEO_INDEX_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Where a video's detected tickers are kept, so each video is read by the AI
 * once and every later viewer gets the stored answer. Only the derived result
 * is stored (tickers, times, stance), never the transcript.
 */
export interface VideoTickerIndexStore {
  get(videoId: string): Promise<VideoTickerIndex | null>;
  put(entry: VideoTickerIndex): Promise<void>;
}

const KEY = (videoId: string) => `video-tickers:v1:${videoId}`;

/**
 * TEMPORARY. Keeps each video's result in the app cache (Upstash Redis when
 * configured, otherwise one server instance's memory) for 30 days, and on a
 * developer's machine also in `.next/cache`, so a restart of `next dev` does
 * not pay for every video again. It stays until the
 * `video_ticker_index` table exists (DRAFT migration 0070). Swap in a
 * Supabase store with the same two methods in `videoTickerIndex()`.
 */
export class TemporaryVideoIndexCache implements VideoTickerIndexStore {
  private readonly devDir = process.env.NODE_ENV === "development" ? path.join(process.cwd(), ".next", "cache", "stoa-video-index") : null;

  async get(videoId: string): Promise<VideoTickerIndex | null> {
    const hit = (await cacheGet<VideoTickerIndex>(KEY(videoId))) ?? (await this.readDev(videoId));
    if (!hit) return null;
    const age = Date.now() - new Date(hit.detectedAt).getTime();
    return age < VIDEO_INDEX_TTL_SECONDS * 1000 ? hit : null;
  }

  async put(entry: VideoTickerIndex): Promise<void> {
    await cacheSet(KEY(entry.videoId), entry, VIDEO_INDEX_TTL_SECONDS);
    if (!this.devDir) return;
    try {
      await mkdir(this.devDir, { recursive: true });
      await writeFile(path.join(this.devDir, `${entry.videoId}.json`), JSON.stringify(entry));
    } catch {
      /* the in-memory copy still serves this run */
    }
  }

  private async readDev(videoId: string): Promise<VideoTickerIndex | null> {
    if (!this.devDir) return null;
    try {
      return JSON.parse(await readFile(path.join(this.devDir, `${videoId}.json`), "utf8")) as VideoTickerIndex;
    } catch {
      return null;
    }
  }
}

let store: VideoTickerIndexStore | null = null;

export function videoTickerIndex(): VideoTickerIndexStore {
  store ??= new TemporaryVideoIndexCache();
  return store;
}
