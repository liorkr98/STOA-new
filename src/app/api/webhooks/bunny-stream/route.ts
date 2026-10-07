import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { claimWebhookEvent } from "@/lib/webhooks/idempotency";
import { checkBunnyWebhookSecret } from "@/lib/webhooks/bunny-auth";
import { settleClipOrRetry } from "@/lib/video/reconcile";

/**
 * Bunny Stream webhook (Part 2.3). Bunny does not sign webhooks, so the URL is
 * protected by a shared secret. The state transition itself lives in
 * `settleClipOrRetry`, shared with the post-upload follow-up, the publication
 * page poll, and the daily cron so a missed or unfinished delivery cannot
 * strand a clip in `processing`.
 *
 * A rejected delivery used to return 401 and vanish, which is a bad failure to
 * have on a path nobody watches: the symptom is "clips never go live" and the
 * cause is invisible. Rejections are now reported, so a misregistered webhook
 * shows up as an error instead of as silence.
 *
 * If BUNNY_STREAM_WEBHOOK_SECRET is missing the endpoint refuses work (503)
 * rather than processing unsigned deliveries.
 */

export async function POST(req: Request) {
  const auth = checkBunnyWebhookSecret(req);
  if (!auth.ok) {
    Sentry.captureMessage(`Bunny webhook rejected: ${auth.reason}`, {
      level: "warning",
      extra: { url: new URL(req.url).pathname, reason: auth.reason },
    });
    return NextResponse.json({ error: "bad secret", reason: auth.reason }, { status: auth.status });
  }

  const event = (await req.json().catch(() => ({}))) as {
    VideoGuid?: string;
    VideoLibraryId?: number;
    Status?: number;
    guid?: string;
  };
  const guid = event.VideoGuid ?? event.guid;
  if (!guid) return NextResponse.json({ ok: true });

  const isNew = await claimWebhookEvent("bunny", `${guid}:${event.Status ?? "?"}`).catch(() => true);
  if (!isNew) return NextResponse.json({ ok: true, duplicate: true });

  const outcome = await settleClipOrRetry(guid, 0);
  return NextResponse.json({ ok: true, outcome });
}

/**
 * Registration check. Returns whether a secret is configured and whether the
 * one supplied would be accepted, so the URL pasted into Bunny can be verified
 * without waiting for an upload. Never reveals the expected value.
 */
export async function GET(req: Request) {
  const auth = checkBunnyWebhookSecret(req);
  return NextResponse.json(
    {
      endpoint: "bunny-stream",
      method: "POST",
      secretConfigured: auth.ok || (!auth.ok && auth.status === 401),
      secretAccepted: auth.ok,
      ...(auth.ok ? {} : { reason: auth.reason }),
    },
    { status: auth.ok ? 200 : auth.status },
  );
}
