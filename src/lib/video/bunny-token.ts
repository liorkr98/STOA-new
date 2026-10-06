import { createHash } from "node:crypto";

/**
 * Bunny CDN token authentication (pull-zone). Off unless BUNNY_TOKEN_KEY is set
 * in the environment AND token authentication is enabled on the Bunny pull zone.
 * Enable that for paid/unlisted clips; public Feed teasers can stay unsigned.
 *
 * https://docs.bunny.net/docs/cdn-token-authentication
 */
export function signBunnyToken(path: string, expiresUnix: number, key: string): string {
  const hash = createHash("sha256")
    .update(key + path + String(expiresUnix))
    .digest("base64");
  return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function applyBunnyToken(url: string, key = process.env.BUNNY_TOKEN_KEY?.trim()): string {
  if (!key) return url;
  const parsed = new URL(url);
  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  parsed.searchParams.set("token", signBunnyToken(parsed.pathname, expires, key));
  parsed.searchParams.set("expires", String(expires));
  return parsed.toString();
}
