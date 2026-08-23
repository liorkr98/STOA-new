/** True when the URL is a file the browser can play with <video>, not an embed. */
export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/demo/")) return true;
  if (url.includes("/storage/v1/object/public/demo-clips/") && url.includes(".mp4")) return true;
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

/** Bunny rows that 403 or have no picture. Do not use them as a poster. */
export function isDeadMediaUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  return /b-cdn\.net|mediadelivery\.net|playlist\.m3u8/i.test(url);
}
