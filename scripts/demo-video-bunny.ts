/**
 * The bit of the Bunny Stream API the demo scripts share.
 *
 * `src/lib/video/bunny.ts` is the real client, but it is marked `server-only`
 * and cannot be imported from a script -- demo-teardown.ts already calls Bunny
 * directly for the same reason. This keeps that duplication in one file instead
 * of three, and holds no top-level side effects so importing it is free.
 */

export const BUNNY_API = "https://video.bunnycdn.com/library";

/** Bunny video.status, from the webhook route's own table. */
export const STATUS_NAMES: Record<number, string> = {
  0: "Created",
  1: "Uploaded",
  2: "Processing",
  3: "Transcoding",
  4: "Finished",
  5: "Error",
  6: "UploadFailed",
};

/** Mirrors MAX_VIDEO_DURATION_SECONDS; the constant lives behind server-only. */
export const MAX_VIDEO_DURATION_SECONDS = 90;

export interface BunnyEnv {
  libraryId: string;
  apiKey: string;
  cdnHostname: string;
}

export function bunnyEnv(): BunnyEnv {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim();
  const missing = [
    !libraryId && "BUNNY_STREAM_LIBRARY_ID",
    !apiKey && "BUNNY_STREAM_API_KEY",
    !cdnHostname && "BUNNY_STREAM_CDN_HOSTNAME",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Bunny Stream is not configured. Missing from .env.local: ${missing.join(", ")}`);
  }
  return { libraryId: libraryId!, apiKey: apiKey!, cdnHostname: cdnHostname! };
}

export interface BunnyVideoRecord {
  guid: string;
  title: string;
  length: number;
  status: number;
  storageSize?: number;
}

/**
 * Confirms the key opens the library, and returns what is already in it.
 * A wrong key gives 401 and a wrong library id gives 404: worth telling apart
 * before ninety uploads rather than after.
 */
export async function probeLibrary(env: BunnyEnv): Promise<{ count: number }> {
  const res = await fetch(
    `${BUNNY_API}/${env.libraryId}/videos?page=1&itemsPerPage=1&orderBy=date`,
    { headers: { AccessKey: env.apiKey, accept: "application/json" } },
  );
  if (res.status === 401) {
    throw new Error("Bunny rejected BUNNY_STREAM_API_KEY (401). The key is wrong, or it belongs to a different library.");
  }
  if (res.status === 404) {
    throw new Error(`Bunny has no library ${env.libraryId} (404). Check BUNNY_STREAM_LIBRARY_ID.`);
  }
  if (!res.ok) {
    throw new Error(`Bunny responded ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  const body = (await res.json()) as { totalItems?: number };
  return { count: body.totalItems ?? 0 };
}

export async function getBunnyVideo(env: BunnyEnv, guid: string): Promise<BunnyVideoRecord | null> {
  const res = await fetch(`${BUNNY_API}/${env.libraryId}/videos/${guid}`, {
    headers: { AccessKey: env.apiKey, accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Bunny responded ${res.status} for ${guid}`);
  return (await res.json()) as BunnyVideoRecord;
}

export async function createBunnyVideo(env: BunnyEnv, title: string): Promise<string> {
  const res = await fetch(`${BUNNY_API}/${env.libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: env.apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ title: title.slice(0, 200) }),
  });
  if (!res.ok) {
    throw new Error(`create failed ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
  const body = (await res.json()) as { guid?: string };
  if (!body.guid) throw new Error("Bunny did not return a video GUID.");
  return body.guid;
}

/**
 * Plain PUT rather than the presigned TUS session the browser uses. TUS exists
 * so a creator's upload never routes through Stoa's servers and can resume on a
 * flaky connection; neither applies to a script pushing small local files.
 */
export async function uploadBunnyVideo(env: BunnyEnv, guid: string, body: Buffer): Promise<void> {
  const res = await fetch(`${BUNNY_API}/${env.libraryId}/videos/${guid}`, {
    method: "PUT",
    headers: { AccessKey: env.apiKey, "Content-Type": "application/octet-stream" },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    throw new Error(`upload failed ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
}

export async function deleteBunnyVideo(env: BunnyEnv, guid: string): Promise<void> {
  await fetch(`${BUNNY_API}/${env.libraryId}/videos/${guid}`, {
    method: "DELETE",
    headers: { AccessKey: env.apiKey, accept: "application/json" },
  }).catch(() => undefined);
}
