import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Video provider interface. Bunny Stream is the platform (encoding, CDN,
 * token-authenticated embeds, TUS resumable upload); the interface exists so a
 * swap costs one file. Components never talk to a provider directly -- they go
 * through /api/video/upload, /api/video/token, and the webhook.
 *
 * Env: BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY,
 *      BUNNY_STREAM_CDN_HOSTNAME   (pull zone, e.g. vz-1a2b3c.b-cdn.net)
 *      BUNNY_STREAM_TOKEN_KEY      (optional: library token-auth key)
 *      BUNNY_STREAM_WEBHOOK_SECRET (optional: shared secret in the webhook URL)
 *
 * With no keys set, getVideoProvider() returns a deterministic mock that plays
 * public sample clips -- same fallback pattern as the market and AI providers,
 * so local dev and CI never depend on a live key. See docs/VIDEO.md.
 */

export interface DirectUpload {
  /** TUS endpoint the browser uploads to. */
  uploadUrl: string;
  /** Provider id of the asset being created (Bunny video GUID). */
  providerAssetId: string;
  /**
   * Headers the browser must send with the TUS upload. Presigned server-side so
   * the API key never reaches the client.
   */
  uploadHeaders: Record<string, string>;
  /** True when this came from the mock provider (no real upload happens). */
  mock?: boolean;
}

export interface PlaybackToken {
  /** Signed token appended to the playback URL / iframe src. */
  token: string;
  /** Full iframe src ready for the player. */
  iframeSrc: string;
  expiresAt: string;
}

export interface ProviderVideo {
  status: "processing" | "ready" | "errored";
  durationSeconds: number | null;
  posterUrl: string | null;
  aspectRatio: string | null;
}

export interface VideoProvider {
  name: string;
  createDirectUpload(opts: { maxDurationSeconds?: number; creatorId: string; title?: string }): Promise<DirectUpload>;
  getPlaybackToken(providerAssetId: string): Promise<PlaybackToken>;
  verifyWebhook(rawBody: string, signatureHeader: string | null): boolean;
  /** Re-read the asset from the provider. Bunny webhooks carry only ids and a
   * status code, so the webhook route confirms state at the source. */
  getVideo(providerAssetId: string): Promise<ProviderVideo | null>;
}

class VideoProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "VideoProviderError";
  }
}

const TOKEN_TTL_S = 60 * 60; // 1h signed playback window
const UPLOAD_TTL_S = 60 * 60;

/* ------------------------------------------------------------------ *
 * Bunny Stream
 * ------------------------------------------------------------------ */

const BUNNY_API = "https://video.bunnycdn.com";
const BUNNY_EMBED = "https://iframe.mediadelivery.net/embed";

function bunnyEnv() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    throw new VideoProviderError(
      "Bunny Stream is not configured (BUNNY_STREAM_LIBRARY_ID / BUNNY_STREAM_API_KEY).",
    );
  }
  return { libraryId, apiKey };
}

export function isBunnyConfigured(): boolean {
  return Boolean(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY);
}

async function bunnyFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { libraryId, apiKey } = bunnyEnv();
  const res = await fetch(`${BUNNY_API}/library/${libraryId}${path}`, {
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
    throw new VideoProviderError(`Bunny Stream responded ${res.status}`);
  }
  return res.json().catch(() => null);
}

/**
 * Bunny status codes: 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding,
 * 4 Finished, 5 Error, 6 UploadFailed. Playable from 3 onward.
 */
function bunnyStatus(code: number | undefined): ProviderVideo["status"] {
  if (code === 5 || code === 6) return "errored";
  if (code != null && code >= 3) return "ready";
  return "processing";
}

function bunnyPoster(guid: string, thumbnailFileName?: string | null): string | null {
  const host = process.env.BUNNY_STREAM_CDN_HOSTNAME;
  if (!host) return null;
  const file = thumbnailFileName || "thumbnail.jpg";
  return `https://${host.replace(/^https?:\/\//, "")}/${guid}/${file}`;
}

export const bunnyStream: VideoProvider = {
  name: "bunny",

  /**
   * Two steps: create the video row at Bunny, then presign a TUS upload so the
   * browser streams the file straight to Bunny. The signature is
   * sha256(libraryId + apiKey + expiry + videoId) -- computed here so the API
   * key never leaves the server.
   */
  async createDirectUpload({ creatorId, title }) {
    const { libraryId, apiKey } = bunnyEnv();
    const created = (await bunnyFetch("/videos", {
      method: "POST",
      body: JSON.stringify({ title: title || `Stoa upload ${creatorId.slice(0, 8)}` }),
    })) as { guid?: string } | null;

    const guid = created?.guid;
    if (!guid) throw new VideoProviderError("Bunny Stream did not return a video id.");

    const expire = Math.floor(Date.now() / 1000) + UPLOAD_TTL_S;
    const signature = createHash("sha256")
      .update(`${libraryId}${apiKey}${expire}${guid}`)
      .digest("hex");

    return {
      uploadUrl: `${BUNNY_API}/tusupload`,
      providerAssetId: guid,
      uploadHeaders: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expire),
        VideoId: guid,
        LibraryId: libraryId,
      },
    };
  },

  /**
   * Bunny token-authenticated embed: sha256(tokenKey + videoId + expiry).
   * Without a token key the library is public-embed and we return the plain
   * iframe src -- entitlement is still enforced upstream in /api/video/token,
   * but a library holding paid content should have token auth switched on.
   */
  async getPlaybackToken(providerAssetId) {
    const { libraryId } = bunnyEnv();
    const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL_S;
    const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
    const base = `${BUNNY_EMBED}/${libraryId}/${providerAssetId}`;

    if (!tokenKey) {
      return { token: "", iframeSrc: base, expiresAt: new Date(expires * 1000).toISOString() };
    }
    const token = createHash("sha256")
      .update(`${tokenKey}${providerAssetId}${expires}`)
      .digest("hex");
    return {
      token,
      iframeSrc: `${base}?token=${token}&expires=${expires}`,
      expiresAt: new Date(expires * 1000).toISOString(),
    };
  },

  /**
   * Bunny Stream webhooks carry no HMAC signature (unlike Cloudflare), so the
   * shared secret travels in the webhook URL you configure in the Bunny
   * dashboard and is compared here in constant time. The webhook route then
   * re-reads the video from the API before writing -- the payload is treated
   * as a hint, never as truth. When no secret is set this returns true and the
   * API re-read is the only guard.
   */
  verifyWebhook(_rawBody, signatureHeader) {
    const secret = process.env.BUNNY_STREAM_WEBHOOK_SECRET;
    if (!secret) return true;
    if (!signatureHeader) return false;
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  async getVideo(providerAssetId) {
    const video = (await bunnyFetch(`/videos/${providerAssetId}`).catch(() => null)) as {
      guid?: string;
      status?: number;
      length?: number;
      width?: number;
      height?: number;
      thumbnailFileName?: string;
    } | null;
    if (!video?.guid) return null;
    return {
      status: bunnyStatus(video.status),
      durationSeconds: video.length ?? null,
      posterUrl: bunnyPoster(video.guid, video.thumbnailFileName),
      aspectRatio: video.width && video.height ? `${video.width}:${video.height}` : null,
    };
  },
};

/* ------------------------------------------------------------------ *
 * Mock provider (no keys configured)
 * ------------------------------------------------------------------ */

/** Public sample clips, so the video block is fully explorable without keys. */
export const MOCK_CLIPS = [
  {
    id: "mock-bigbuckbunny",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    duration: 596,
  },
  {
    id: "mock-elephantsdream",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    duration: 653,
  },
  {
    id: "mock-forbiggerblazes",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    duration: 15,
  },
  {
    id: "mock-subaru",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    poster:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg",
    duration: 594,
  },
] as const;

function clipFor(id: string) {
  const match = MOCK_CLIPS.find((c) => c.id === id);
  if (match) return match;
  // Stable pick so the same asset always yields the same clip.
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return MOCK_CLIPS[hash % MOCK_CLIPS.length];
}

export const mockVideoProvider: VideoProvider = {
  name: "mock",

  async createDirectUpload({ creatorId }) {
    const id = `mock-${creatorId.slice(0, 8)}-${Date.now().toString(36)}`;
    return { uploadUrl: "", providerAssetId: id, uploadHeaders: {}, mock: true };
  },

  async getPlaybackToken(providerAssetId) {
    const clip = clipFor(providerAssetId);
    return {
      token: "mock",
      iframeSrc: clip.src,
      expiresAt: new Date(Date.now() + TOKEN_TTL_S * 1000).toISOString(),
    };
  },

  verifyWebhook() {
    return true;
  },

  async getVideo(providerAssetId) {
    const clip = clipFor(providerAssetId);
    return {
      status: "ready",
      durationSeconds: clip.duration,
      posterUrl: clip.poster,
      aspectRatio: "16:9",
    };
  },
};

/** The active provider. Bunny when configured, otherwise the mock. */
export function getVideoProvider(): VideoProvider {
  return isBunnyConfigured() ? bunnyStream : mockVideoProvider;
}
