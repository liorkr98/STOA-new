/** True when the URL is a file the browser can play with <video>, not an embed. */
export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/demo/")) return true;
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

/**
 * HLS. Adaptive by construction: the manifest lists renditions and the player
 * picks one per segment, which is the whole point on a phone connection.
 * Safari plays it in `<video>` natively; everything else needs hls.js.
 */
export function isHlsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.m3u8(\?|#|$)/i.test(url);
}

/** Anything `NativeClip` can drive, so the Feed keeps its own chrome. */
export function isPlayableVideoUrl(url: string | null | undefined): boolean {
  return isDirectVideoUrl(url) || isHlsUrl(url);
}
