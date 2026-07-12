/**
 * Single source of truth for the site's canonical origin. Used by
 * metadataBase, canonical URLs, JSON-LD identifiers, and sitemap.ts so a
 * production domain change is one env var, not a grep-and-replace.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://stoa.app"
).replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
