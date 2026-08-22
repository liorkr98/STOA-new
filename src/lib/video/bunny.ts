import "server-only";
import { createHash } from "node:crypto";
import { MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";

export { MAX_VIDEO_DURATION_SECONDS };

/**
 * Bunny Stream provider (Part 2.1). Half the cost of Cloudflare Stream for
 * equivalent basic hosting, encoding + player + AI captions bundled in.
 *
 * Components never call this directly -- they go through routes that use it.
 * Browser upload is direct-to-Bunny via a presigned TUS session (Part 2.3), so
 * large files never route through Stoa's application servers.
 *
 * Env (all server-only, never NEXT_PUBLIC_*):
 *   BUNNY_STREAM_LIBRARY_ID      numeric video library id
 *   BUNNY_STREAM_API_KEY         library API key (AccessKey)
 *   BUNNY_STREAM_CDN_HOSTNAME    pull-zone hostname, e.g. vz-xxxx.b-cdn.net
 *   BUNNY_STREAM_WEBHOOK_SECRET  optional shared secret echoed on the webhook URL
 */

const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";
const API_BASE = "https://video.bunnycdn.com/library";
const UPLOAD_TTL_SECONDS = 60 * 60; // 1h presigned upload window

export class BunnyStreamError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "BunnyStreamError";
  }
}

interface BunnyEnv {
  libraryId: string;
  apiKey: string;
  cdnHostname: string;
}

function bunnyEnv(): BunnyEnv {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim();
  if (!libraryId || !apiKey || !cdnHostname) {
    throw new BunnyStreamError(
      "Bunny Stream is not configured (BUNNY_STREAM_LIBRARY_ID / BUNNY_STREAM_API_KEY / BUNNY_STREAM_CDN_HOSTNAME).",
    );
  }
  return { libraryId, apiKey, cdnHostname };
}

export function isBunnyConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID &&
      process.env.BUNNY_STREAM_API_KEY &&
      process.env.BUNNY_STREAM_CDN_HOSTNAME,
  );
}

async function bunnyFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { libraryId, apiKey } = bunnyEnv();
  const res = await fetch(`${API_BASE}/${libraryId}${path}`, {
    ...init,
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new BunnyStreamError(`Bunny Stream responded ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json().catch(() => ({}));
}

/** CDN URLs derived from the video GUID (Bunny's deterministic path scheme). */
export function bunnyPlaybackUrl(guid: string): string {
  const { cdnHostname } = bunnyEnv();
  return `https://${cdnHostname}/${guid}/playlist.m3u8`;
}

export function bunnyThumbnailUrl(guid: string): string {
  const { cdnHostname } = bunnyEnv();
  return `https://${cdnHostname}/${guid}/thumbnail.jpg`;
}

/** Animated muted preview used for hover/in-view autoplay in the video card. */
export function bunnyPreviewUrl(guid: string): string {
  const { cdnHostname } = bunnyEnv();
  return `https://${cdnHostname}/${guid}/preview.webp`;
}

export function bunnyCaptionVttUrl(guid: string, lang = "en"): string {
  const { cdnHostname } = bunnyEnv();
  return `https://${cdnHostname}/${guid}/captions/${lang}.vtt`;
}

/** Bunny's own embed player (handles HLS + captions + disclosure track). */
export function bunnyEmbedUrl(
  guid: string,
  opts: { autoplay?: boolean; muted?: boolean; loop?: boolean; chrome?: boolean } = {},
): string {
  const { libraryId } = bunnyEnv();
  const params = new URLSearchParams({
    autoplay: String(opts.autoplay ?? false),
    muted: String(opts.muted ?? false),
    loop: String(opts.loop ?? false),
    preload: "true",
    responsive: "true",
  });
  // Bunny reads `controls` as the list of controls to draw, so an empty list
  // draws none. The Feed passes chrome: false because it supplies its own
  // progress bar, mute and play controls, and Bunny's default bar sits exactly
  // where the analyst's lower-third identity band goes.
  if (opts.chrome === false) params.set("controls", "");
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}?${params.toString()}`;
}

interface BunnyVideo {
  guid: string;
  title: string;
  length: number; // seconds
  status: number; // 0..5, 4 = finished
  thumbnailFileName?: string;
  hasMP4Fallback?: boolean;
  captions?: { srclang: string; label: string }[];
}

/** Create the video object, returning its GUID. Duration is unknown until upload finishes. */
export async function createBunnyVideo(title: string): Promise<{ guid: string }> {
  const result = (await bunnyFetch("/videos", {
    method: "POST",
    body: JSON.stringify({ title: title.slice(0, 200) }),
  })) as { guid?: string };
  if (!result.guid) throw new BunnyStreamError("Bunny did not return a video GUID.");
  return { guid: result.guid };
}

export async function getBunnyVideo(guid: string): Promise<BunnyVideo> {
  const result = (await bunnyFetch(`/videos/${guid}`)) as BunnyVideo;
  return result;
}

export async function deleteBunnyVideo(guid: string): Promise<void> {
  await bunnyFetch(`/videos/${guid}`, { method: "DELETE" }).catch(() => undefined);
}

/** Request Bunny's built-in AI transcription/captions for a language. */
export async function requestBunnyCaptions(guid: string, lang = "en"): Promise<void> {
  await bunnyFetch(`/videos/${guid}/transcribe?language=${lang}`, { method: "POST" }).catch(
    () => undefined,
  );
}

export interface BunnyPresignedUpload {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
}

/**
 * Presigned TUS upload (Part 2.3). The browser POSTs the file straight to
 * Bunny with these headers; the API key never reaches the client. Signature
 * per Bunny docs: sha256(libraryId + apiKey + expire + videoId).
 */
export function createPresignedUpload(guid: string): BunnyPresignedUpload {
  const { libraryId, apiKey } = bunnyEnv();
  const expire = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
  const authorizationSignature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${guid}`)
    .digest("hex");
  return {
    endpoint: TUS_ENDPOINT,
    libraryId,
    videoId: guid,
    authorizationSignature,
    authorizationExpire: expire,
  };
}

/**
 * Fetch a Bunny VTT caption file and flatten it to plain transcript text for
 * the fact-checker (Part 2.5). Returns null if captions are not ready.
 */
export async function fetchTranscriptFromVtt(guid: string, lang = "en"): Promise<string | null> {
  try {
    const res = await fetch(bunnyCaptionVttUrl(guid, lang), { cache: "no-store" });
    if (!res.ok) return null;
    const vtt = await res.text();
    return vttToPlainText(vtt);
  } catch {
    return null;
  }
}

/** Strip WEBVTT headers, cue numbers, and timestamps down to spoken text. */
export function vttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.toUpperCase().startsWith("WEBVTT")) continue;
    if (/^\d+$/.test(trimmed)) continue; // cue index
    if (trimmed.includes("-->")) continue; // timestamp
    if (/^(NOTE|STYLE|REGION)\b/.test(trimmed)) continue;
    out.push(trimmed.replace(/<[^>]+>/g, ""));
  }
  return out.join(" ").replace(/\s{2,}/g, " ").trim();
}
