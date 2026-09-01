import { NextResponse } from "next/server";
import { claimWebhookEvent } from "@/lib/webhooks/idempotency";
import { reconcileClip } from "@/lib/video/reconcile";

/**
 * Bunny Stream webhook (Part 2.3). Bunny does not sign webhooks, so the URL is
 * protected by a shared secret query param. The state transition itself lives in
 * `reconcileClip`, shared with the maintenance cron and the publication page so
 * a missed delivery cannot strand a clip in `processing`.
 */
export async function POST(req: Request) {
  const secret = process.env.BUNNY_STREAM_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "bad secret" }, { status: 401 });
    }
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
