import { createHash } from "node:crypto";

/**
 * Bunny's token authentication, in the two forms Stoa needs. Pure functions:
 * the key is passed in. Used by src/lib/media/sign.ts once
 * BUNNY_CDN_TOKEN_KEY / BUNNY_EMBED_TOKEN_KEY are set; until token
 * authentication is switched on in the Bunny dashboard these are unused.
 */

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64").replace(/\n/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * A CDN URL signed for its whole video folder (`/<guid>/`), with the token in
 * the path, so the HLS playlist's relative segment and rendition URLs carry it
 * too. Bunny's "advanced" token: base64url(sha256(key + token_path + expires +
 * "token_path=" + token_path)).
 */
export function signBunnyCdnUrl(url: string, key: string, expires: number): string {
  const u = new URL(url);
  const folder = u.pathname.split("/").filter(Boolean)[0];
  if (!folder) return url;
  const tokenPath = `/${folder}/`;
  const parameterData = `token_path=${tokenPath}`;
  const token = base64Url(createHash("sha256").update(key + tokenPath + expires + parameterData).digest());
  return `${u.protocol}//${u.host}/bcdn_token=${token}&token_path=${encodeURIComponent(tokenPath)}&expires=${expires}${u.pathname}${u.search}`;
}

/** Bunny's embed player token: hex(sha256(key + videoId + expires)). */
export function signBunnyEmbedUrl(url: string, key: string, expires: number): string {
  const u = new URL(url);
  const videoId = u.pathname.split("/").filter(Boolean).pop();
  if (!videoId) return url;
  u.searchParams.set("token", createHash("sha256").update(key + videoId + expires).digest("hex"));
  u.searchParams.set("expires", String(expires));
  return u.toString();
}
