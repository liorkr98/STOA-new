/**
 * Stoa's stored media lives in Supabase Storage buckets. Three of them hold
 * paid or publication media and are private: nothing in them is served from a
 * permanent public address. Rows and report bodies still store the object's
 * public-form URL (`.../storage/v1/object/public/<bucket>/<path>`), which is
 * only an identifier once the bucket is private.
 *
 * Images are drawn through `mediaSrc`, which turns that identifier into a
 * Stoa address (`/m/<bucket>/<path>`) that answers with a short-lived signed
 * link (src/app/m/[bucket]/[...path]/route.ts). Video, captions and posters
 * are signed on the server as they are read (src/lib/media/sign.ts).
 *
 * Client-safe: no secrets, no network.
 */

export const PRIVATE_BUCKETS = ["demo-clips", "report-images", "chart-snapshots"] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

export type StorageObject = { bucket: PrivateBucket; path: string };

const OBJECT_URL = /^https:\/\/([^/]+)\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/;

function projectHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host || null;
  } catch {
    return null;
  }
}

export function isPrivateBucket(bucket: string): bucket is PrivateBucket {
  return (PRIVATE_BUCKETS as readonly string[]).includes(bucket);
}

/** A safe object path: no traversal, no empty segments. */
export function isSafeObjectPath(path: string): boolean {
  if (!path || path.length > 512) return false;
  return path.split("/").every((seg) => seg.length > 0 && seg !== "." && seg !== "..");
}

/**
 * The private-bucket object a stored URL points at, or null when it is any
 * other URL (another bucket such as avatars, Bunny, a local object URL).
 */
export function privateObject(url: string | null | undefined, host: string | null = projectHost()): StorageObject | null {
  if (!url) return null;
  const m = OBJECT_URL.exec(url);
  if (!m || (host && m[1] !== host)) return null;
  const [, , bucket, rawPath] = m;
  if (!isPrivateBucket(bucket)) return null;
  let path: string;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  return isSafeObjectPath(path) ? { bucket, path } : null;
}

/** The Stoa address for one object. */
export function mediaPath(object: StorageObject): string {
  return `/m/${object.bucket}/${object.path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * What an `<img src>` should get for a stored media URL: the Stoa address for
 * a private-bucket object, anything else unchanged.
 */
export function mediaSrc<T extends string | null | undefined>(url: T): T {
  const object = privateObject(url);
  return (object ? mediaPath(object) : url) as T;
}
