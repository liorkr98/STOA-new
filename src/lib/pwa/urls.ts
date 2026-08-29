/**
 * Same-origin helpers for OAuth and PayPal returns.
 *
 * Standalone PWAs break when a redirect lands on a different host (or an
 * open-redirect `next`). Everything that leaves the device and comes back
 * must reuse the request origin and a path that stays on it.
 */

export function sameOriginPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return fallback;
  return next;
}

/** Absolute URL on `origin` for a path that must not escape this host. */
export function appUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const pathname = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(pathname, `${base}/`);
  if (url.origin !== new URL(base).origin) {
    throw new Error("Return path must stay on this origin");
  }
  return url.toString();
}
