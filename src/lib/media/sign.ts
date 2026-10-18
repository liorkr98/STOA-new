import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { signBunnyCdnUrl, signBunnyEmbedUrl } from "@/lib/media/bunny-token";
import { privateObject, type StorageObject } from "@/lib/media/storage-url";

/**
 * Short-lived links for stored media, made on the server as rows are read.
 *
 * - Private-bucket objects (demo clips and their posters, report images,
 *   chart snapshots) get a Supabase signed URL.
 * - Bunny CDN URLs get Bunny's token once BUNNY_CDN_TOKEN_KEY is set (the
 *   pull zone's token authentication key), and embed URLs once
 *   BUNNY_EMBED_TOKEN_KEY is set (the library's embed token key). Until
 *   token authentication is switched on in the Bunny dashboard they pass
 *   through unsigned and the pull zone's referrer rule is the only protection.
 * - Anything else (avatars, local object URLs, fixtures) is returned as is.
 *
 * A signed link stays valid for MEDIA_TTL_SECONDS, long enough to finish a
 * clip that was opened near the end of that window. A link is reused while it
 * has more than an hour left, so a busy page does not sign every request.
 */
export const MEDIA_TTL_SECONDS = 4 * 60 * 60;
const REUSE_MARGIN_MS = 60 * 60 * 1000;
const MEMO_LIMIT = 5000;

const memo = new Map<string, { url: string; until: number }>();

function remember(key: string, url: string, until: number) {
  if (memo.size >= MEMO_LIMIT) memo.delete(memo.keys().next().value as string);
  memo.set(key, { url, until });
}

function recalled(key: string, now: number): string | null {
  const hit = memo.get(key);
  if (hit && hit.until - now > REUSE_MARGIN_MS) return hit.url;
  if (hit) memo.delete(key);
  return null;
}

function bunnyHost(): string | null {
  return process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim() || null;
}

function signBunny(url: string, now: number): string {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return url;
  }
  const expires = Math.floor(now / 1000) + MEDIA_TTL_SECONDS;
  const cdnKey = process.env.BUNNY_CDN_TOKEN_KEY?.trim();
  const embedKey = process.env.BUNNY_EMBED_TOKEN_KEY?.trim();
  if (cdnKey && host === bunnyHost()) return signBunnyCdnUrl(url, cdnKey, expires);
  if (embedKey && host === "iframe.mediadelivery.net") return signBunnyEmbedUrl(url, embedKey, expires);
  return url;
}

/** One Supabase call per bucket for everything not already remembered. */
async function signObjects(objects: StorageObject[], now: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const missing = new Map<string, Set<string>>();
  for (const o of objects) {
    const key = `${o.bucket}/${o.path}`;
    const hit = recalled(key, now);
    if (hit) out.set(key, hit);
    else missing.set(o.bucket, (missing.get(o.bucket) ?? new Set()).add(o.path));
  }
  if (missing.size === 0) return out;
  const admin = createAdminClient();
  await Promise.all(
    [...missing].map(async ([bucket, paths]) => {
      const { data } = await admin.storage.from(bucket).createSignedUrls([...paths], MEDIA_TTL_SECONDS);
      for (const row of data ?? []) {
        if (!row.signedUrl || !row.path) continue;
        const key = `${bucket}/${row.path}`;
        out.set(key, row.signedUrl);
        remember(key, row.signedUrl, now + MEDIA_TTL_SECONDS * 1000);
      }
    }),
  );
  return out;
}

/**
 * Signs every media URL in `urls`. Returns a lookup from each original URL to
 * the link a reader should get. An object that could not be signed (missing,
 * storage down) maps to null rather than to its unusable public address.
 */
export async function signMediaUrls(urls: Iterable<string | null | undefined>): Promise<(url: string | null | undefined) => string | null> {
  const now = Date.now();
  const objects = new Map<string, StorageObject>();
  for (const url of urls) {
    const o = url ? privateObject(url) : null;
    if (o) objects.set(url!, o);
  }
  let signed = new Map<string, string>();
  try {
    signed = await signObjects([...objects.values()], now);
  } catch {
    /* storage unreachable: private objects resolve to null below */
  }
  return (url) => {
    if (!url) return null;
    const o = objects.get(url);
    if (o) return signed.get(`${o.bucket}/${o.path}`) ?? null;
    return signBunny(url, now);
  };
}

/** Signs one Bunny embed URL (the embed is built from the guid, not stored). */
export function signEmbedUrl(url: string): string {
  return signBunny(url, Date.now());
}
