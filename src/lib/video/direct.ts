/** True when the URL is a file the browser can play with <video>, not an embed. */
export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/demo/")) return true;
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}
