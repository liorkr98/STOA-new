import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { claimWebhookEvent } from "@/lib/webhooks/idempotency";
import { normalizeSecret, secretsMatch } from "@/lib/webhooks/secret";
import { reconcileClip } from "@/lib/video/reconcile";

/**
 * Bunny Stream webhook (Part 2.3). Bunny does not sign webhooks, so the URL is
 * protected by a shared secret. The state transition itself lives in
 * `reconcileClip`, shared with the maintenance cron and the publication page so
 * a missed delivery cannot strand a clip in `processing`.
 *
 * A rejected delivery used to return 401 and vanish, which is a bad failure to
 * have on a path nobody watches: the symptom is "clips never go live" and the
 * cause is invisible. Rejections are now reported, so a misregistered webhook
 * shows up as an error instead of as silence.
 */

/** Accepts the secret from the URL or, when the value is query-hostile, a header. */
const SECRET_HEADER = "x-stoa-webhook-secret";

function checkSecret(req: Request): { ok: true } | { ok: false; reason: string } {
  const expected = normalizeSecret(process.env.BUNNY_STREAM_WEBHOOK_SECRET);
  // No secret configured: the endpoint is open by design, as before.
  if (!expected) return { ok: true };

  const fromQuery = normalizeSecret(new URL(req.url).searchParams.get("secret"));
  const fromHeader = normalizeSecret(req.headers.get(SECRET_HEADER));

  if (secretsMatch(expected, fromQuery) || secretsMatch(expected, fromHeader)) {
    return { ok: true };
  }
  if (!fromQuery && !fromHeader) return { ok: false, reason: "no secret supplied" };
  return { ok: false, reason: "secret did not match" };
}

export async function POST(req: Request) {
  const auth = checkSecret(req);
  if (!auth.ok) {
    // Deliberately loud. This is the only signal that a webhook was registered
    // with the wrong host, a stale secret, or a secret the query string mangled.
    Sentry.captureMessage(`Bunny webhook rejected: ${auth.reason}`, {
      level: "warning",
      extra: { url: new URL(req.url).pathname, reason: auth.reason },
    });
    return NextResponse.json({ error: "bad secret", reason: auth.reason }, { status: 401 });
  }

  const event = (await req.json().catch(() => ({}))) as {
    VideoGuid?: string;
    VideoLibraryId?: number;
    Status?: number;
    guid?: string;
  };
  const guid = event.VideoGuid ?? event.guid;
  if (!guid) return NextResponse.json({ ok: true });

  // Idempotency: Bunny has no event id, so dedupe on the status transition.
  // A re-delivered "finished" webhook must not re-enqueue processing twice.
  const isNew = await claimWebhookEvent("bunny", `${guid}:${event.Status ?? "?"}`).catch(() => true);
  if (!isNew) return NextResponse.json({ ok: true, duplicate: true });

  const outcome = await reconcileClip(guid);
  return NextResponse.json({ ok: true, outcome });
}

/**
 * Registration check. Returns whether a secret is configured and whether the
 * one supplied would be accepted, so the URL pasted into Bunny can be verified
 * without waiting for an upload. Never reveals the expected value.
 */
export async function GET(req: Request) {
  const auth = checkSecret(req);
  return NextResponse.json({
    endpoint: "bunny-stream",
    method: "POST",
    secretConfigured: Boolean(normalizeSecret(process.env.BUNNY_STREAM_WEBHOOK_SECRET)),
    secretAccepted: auth.ok,
    ...(auth.ok ? {} : { reason: auth.reason }),
  });
}
