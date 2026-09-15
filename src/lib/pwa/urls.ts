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
  if (path.includes("://") || path.startsWith("//")) {
    throw new Error("Return path must stay on this origin");
  }
  const base = origin.replace(/\/+$/, "");
  const pathname = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(pathname, `${base}/`);
  if (url.origin !== new URL(base).origin) {
    throw new Error("Return path must stay on this origin");
  }
  return url.toString();
}

/** Confirm an absolute return URL was built for this request's origin. */
export function requireAppUrl(origin: string, absolute: string): string {
  const parsed = new URL(absolute);
  if (parsed.origin !== new URL(origin.replace(/\/+$/, "")).origin) {
    throw new Error("Return URL must stay on this origin");
  }
  return parsed.toString();
}

/**
 * The request's own origin, for links that must come back to this host
 * (OAuth, email confirm, PayPal). Preview and localhost each get themselves.
 */
export function originFromForwarded(
  host: string | null | undefined,
  proto: string | null | undefined,
  fallback: string,
): string {
  if (!host) return fallback;
  const hostname = host.split(",")[0]?.trim() ?? "";
  if (!hostname) return fallback;
  const rawProto = proto?.split(",")[0]?.trim().toLowerCase();
  const protocol =
    rawProto === "http" || rawProto === "https"
      ? rawProto
      : hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return `${protocol}://${hostname}`;
}
