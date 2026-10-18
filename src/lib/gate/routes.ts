/**
 * The signed-out wall's map (FEATURE_GATED_SITE, src/lib/flags/gated-site.ts):
 * which paths a visitor with no session may open, and, for every other path,
 * what the sign-in prompt says is behind it. Pure and edge-safe: middleware
 * reads it on every request.
 */

/** Pages anyone may open. Everything else needs a session. */
export const PUBLIC_PAGES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/consent-required",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/terms/creators",
  "/privacy",
  "/cookies",
  "/accessibility",
  "/not-advice",
  "/subprocessors",
  "/compliance-brief",
] as const;

/**
 * Paths that are not pages a reader browses, and look after themselves: the
 * sign-in callbacks, the prompt itself, framework and metadata files, the
 * offline fallback, and API routes (each content route checks the session
 * itself; market prices stay open for the landing page's tape).
 */
const INFRASTRUCTURE_PREFIXES = ["/auth/", "/api/", "/_next/", "/m/", "/signed-out", "/sentry-tunnel"];
const INFRASTRUCTURE_FILES = new Set([
  "/offline",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon",
  "/apple-icon",
  "/sw.js",
]);

function clean(pathname: string): string {
  const p = pathname.split(/[?#]/)[0] || "/";
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

export function isPublicPage(pathname: string): boolean {
  return (PUBLIC_PAGES as readonly string[]).includes(clean(pathname));
}

/** True when the wall leaves this path alone. */
export function isOpenPath(pathname: string): boolean {
  const p = clean(pathname);
  if (isPublicPage(p) || INFRASTRUCTURE_FILES.has(p)) return true;
  if (/^\/(icon|apple-icon)\/[^/]+$/.test(p)) return true;
  return INFRASTRUCTURE_PREFIXES.some((prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix));
}

/** What sits behind a gated path, for the prompt and its link preview. */
export type GatedTarget =
  | { kind: "report"; id: string }
  | { kind: "analyst"; handle: string }
  | { kind: "ticker"; ticker: string }
  | { kind: "page"; name: string };

const PAGE_NAMES: Record<string, string> = {
  home: "Today",
  feed: "the Feed",
  explore: "Explore",
  markets: "Markets",
  search: "Search",
  dispatch: "the Dispatch",
  saved: "your Library",
  notebook: "your notebook",
  following: "Following",
  subscriptions: "your subscriptions",
  inbox: "your inbox",
  wallet: "your wallet",
  profile: "your profile",
  settings: "your settings",
  studio: "Studio",
  "become-analyst": "the analyst application",
  onboarding: "your setup",
  dashboard: "your dashboard",
  watchlist: "your watchlist",
  portfolio: "your portfolio",
  screener: "the screener",
  report: "this publication",
  analyst: "this analyst's page",
  admin: "this page",
  dev: "this page",
  demo: "this video",
};

export function gatedTarget(pathname: string): GatedTarget {
  const [first = "", second = "", third = ""] = clean(pathname).split("/").filter(Boolean);
  const decoded = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  if (first === "report" && /^[0-9a-f-]{36}$/i.test(second)) return { kind: "report", id: second.toLowerCase() };
  if (first === "analyst" && second) return { kind: "analyst", handle: decoded(second).replace(/^@/, "") };
  if (first === "markets" && second && second !== "sector" && second !== "theme") {
    return { kind: "ticker", ticker: decoded(second).toUpperCase() };
  }
  if (first === "markets" && (second === "sector" || second === "theme") && third) {
    return { kind: "page", name: `the ${decoded(third).replace(/-/g, " ")} ${second}` };
  }
  return { kind: "page", name: PAGE_NAMES[first] ?? "this page" };
}

/** The prompt's line, e.g. "Sign in to read this publication." */
export function gatedHeadline(target: GatedTarget, analystName?: string | null): string {
  switch (target.kind) {
    case "report":
      return "Sign in to read this publication";
    case "analyst":
      return `Sign in to see ${analystName ?? `@${target.handle}`}'s publications`;
    case "ticker":
      return `Sign in to see the research on ${target.ticker}`;
    case "page":
      return `Sign in to open ${target.name}`;
  }
}
