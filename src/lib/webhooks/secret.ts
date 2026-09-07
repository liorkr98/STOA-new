import "server-only";

/**
 * Shared-secret comparison for webhook URLs.
 *
 * Both sides of this comparison are pasted by hand: the value into a hosting
 * dashboard's environment field, and the URL into the provider's webhook
 * field. Both routinely pick up a trailing newline or a stray space, and a raw
 * `!==` then rejects every delivery forever with nothing logged. `CRON_SECRET`
 * already learned this (see lib/cron/auth.ts); this is the same lesson for
 * provider webhooks.
 *
 * Note this cannot rescue a secret mangled by the query string itself: `+`
 * arrives as a space and `&` or `#` truncates the value. A secret containing
 * those characters has to be sent in the header instead, or regenerated
 * without them.
 */
export function normalizeSecret(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return cleaned || null;
}

/** Constant-time-ish compare on already-normalized values. */
export function secretsMatch(expected: string, provided: string | null): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
