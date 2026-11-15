/**
 * Closed preview: the site is invite-only unless STOA_INVITE_ONLY=0.
 * Existing accounts sign in as usual. New people need a /join/TOKEN link.
 * This file is Edge-safe (middleware).
 */

export const INVITE_COOKIE = "stoa-invite";
export const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function isInviteOnly(): boolean {
  return process.env.STOA_INVITE_ONLY !== "0";
}

const ALLOW_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/join",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/subprocessors",
  "/not-advice",
  "/compliance-brief",
  "/offline",
  "/consent-required",
  "/dev",
];

const MACHINE_PREFIXES = ["/api/cron", "/api/jobs", "/api/internal", "/api/webhooks"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Signed-out visitors may load these without an invite. `/` is the closed door. */
export function isInviteAllowlistedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ALLOW_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Server-to-server routes authenticate themselves. Never bounce these to `/`. */
export function isMachinePath(pathname: string): boolean {
  return MACHINE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Auth user created in this callback (or a few minutes ago). Existing accounts are older. */
export function isFreshAuthUser(createdAt: string | undefined): boolean {
  if (!createdAt) return true;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t < 10 * 60 * 1000;
}

export function inviteCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: INVITE_COOKIE_MAX_AGE,
  };
}
