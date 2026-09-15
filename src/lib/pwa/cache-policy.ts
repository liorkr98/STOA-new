/**
 * What the app-shell worker must never intercept.
 *
 * HLS, Bunny, and the local demo MP4s would blow Cache Storage and go stale.
 * Keep this in sync with `public/sw.js`.
 */
export function shouldBypassServiceWorker(url: { pathname: string; hostname: string }): boolean {
  if (/\.(m3u8|m4s|ts|mp4|webm|mpd)$/i.test(url.pathname)) return true;
  if (url.pathname.startsWith("/demo/")) return true;
  const host = url.hostname;
  return (
    host.includes("b-cdn.net") ||
    host.includes("mediadelivery.net") ||
    host.includes("bunnycdn.com") ||
    host.includes("iframe.mediadelivery.net")
  );
}
