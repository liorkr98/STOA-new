import { normalizeSecret, secretsMatch } from "@/lib/webhooks/secret";

export const BUNNY_SECRET_HEADER = "x-stoa-webhook-secret";

export type BunnySecretCheck =
  | { ok: true }
  | { ok: false; reason: string; status: 401 | 503 };

/**
 * Bunny does not sign webhooks. The shared secret must be configured; an unset
 * secret used to leave the endpoint open.
 */
export function checkBunnyWebhookSecret(
  req: { url: string; headers: { get(name: string): string | null } },
  expectedRaw: string | null | undefined = process.env.BUNNY_STREAM_WEBHOOK_SECRET,
): BunnySecretCheck {
  const expected = normalizeSecret(expectedRaw);
  if (!expected) {
    return { ok: false, reason: "secret not configured", status: 503 };
  }

  const fromQuery = normalizeSecret(new URL(req.url).searchParams.get("secret"));
  const fromHeader = normalizeSecret(req.headers.get(BUNNY_SECRET_HEADER));

  if (secretsMatch(expected, fromQuery) || secretsMatch(expected, fromHeader)) {
    return { ok: true };
  }
  if (!fromQuery && !fromHeader) {
    return { ok: false, reason: "no secret supplied", status: 401 };
  }
  return { ok: false, reason: "secret did not match", status: 401 };
}
