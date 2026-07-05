import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Video provider interface (Part D). Cloudflare Stream is the default
 * (encoding included, signed playback tokens, plain HTTP API -- no SDK);
 * Mux slots in behind the same interface when analytics matter. Components
 * never talk to a provider directly; they go through routes that use this.
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN,
 *      CLOUDFLARE_STREAM_WEBHOOK_SECRET (from the webhook subscription).
 */

export interface DirectUpload {
  /** Where the browser uploads the file. */
  uploadUrl: string;
  /** Provider id of the asset being created (Cloudflare uid). */
  providerAssetId: string;
}

export interface PlaybackToken {
  /** Signed token appended to the playback URL / iframe src. */
  token: string;
  /** Full iframe src ready for the player. */
  iframeSrc: string;
  expiresAt: string;
}

export interface VideoProvider {
  name: string;
  createDirectUpload(opts: { maxDurationSeconds?: number; creatorId: string }): Promise<DirectUpload>;
  getPlaybackToken(providerAssetId: string): Promise<PlaybackToken>;
  verifyWebhook(rawBody: string, signatureHeader: string | null): boolean;
}

class VideoProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "VideoProviderError";
  }
}

function cfEnv() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new VideoProviderError(
      "Cloudflare Stream is not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN).",
    );
  }
  return { accountId, apiToken };
}

async function cfFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { accountId, apiToken } = cfEnv();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: unknown;
    errors?: { message?: string }[];
  } | null;
  if (!res.ok || !json?.success) {
    throw new VideoProviderError(json?.errors?.[0]?.message ?? `Cloudflare responded ${res.status}`);
  }
  return json.result;
}

const TOKEN_TTL_S = 60 * 60; // 1h signed playback window

export const cloudflareStream: VideoProvider = {
  name: "cloudflare",

  /** tus-less direct creator upload: one-time URL the browser POSTs the file to. */
  async createDirectUpload({ maxDurationSeconds = 3600, creatorId }) {
    const result = (await cfFetch("/stream/direct_upload", {
      method: "POST",
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: true,
        creator: creatorId,
      }),
    })) as { uploadURL: string; uid: string };
    return { uploadUrl: result.uploadURL, providerAssetId: result.uid };
  },

  /** Short-lived signed token; playback is gated by /api/video/token upstream. */
  async getPlaybackToken(providerAssetId) {
    const result = (await cfFetch(`/stream/${providerAssetId}/token`, {
      method: "POST",
      body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S }),
    })) as { token: string };
    return {
      token: result.token,
      iframeSrc: `https://iframe.videodelivery.net/${result.token}`,
      expiresAt: new Date(Date.now() + TOKEN_TTL_S * 1000).toISOString(),
    };
  },

  /** Cloudflare Webhook-Signature: "time=<unix>,sig1=<hmac-sha256(time.body)>". */
  verifyWebhook(rawBody, signatureHeader) {
    const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    if (!secret || !signatureHeader) return false;
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => p.split("=", 2) as [string, string]),
    );
    const time = parts["time"];
    const sig = parts["sig1"];
    if (!time || !sig) return false;
    const expected = createHmac("sha256", secret).update(`${time}.${rawBody}`).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  },
};

/** The active provider. Swap to a Mux implementation here when analytics matter. */
export function getVideoProvider(): VideoProvider {
  return cloudflareStream;
}
