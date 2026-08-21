import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideoProvider } from "@/lib/video/provider";

/**
 * Bunny Stream webhook. Bunny posts only ids and a status code and signs
 * nothing, so the payload is treated as a hint: the shared secret in the
 * webhook URL is checked first, then the asset is re-read from the Bunny API
 * and *that* is what gets written. Service-role client because webhooks carry
 * no user session. Idempotent -- re-delivery writes the same terminal state.
 *
 * Configure in Bunny: Stream > Library > Webhook URL, pointing at
 *   https://<host>/api/webhooks/bunny-stream?secret=<BUNNY_STREAM_WEBHOOK_SECRET>
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const provider = getVideoProvider();

  const secretParam = new URL(req.url).searchParams.get("secret");
  if (!provider.verifyWebhook(rawBody, secretParam)) {
    return NextResponse.json({ error: "bad secret" }, { status: 401 });
  }

  const event = JSON.parse(rawBody || "{}") as {
    VideoGuid?: string;
    VideoLibraryId?: number | string;
    Status?: number;
  };
  const guid = event.VideoGuid;
  if (!guid) return NextResponse.json({ ok: true });

  const configuredLibrary = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (
    configuredLibrary &&
    event.VideoLibraryId != null &&
    String(event.VideoLibraryId) !== configuredLibrary
  ) {
    return NextResponse.json({ error: "wrong library" }, { status: 401 });
  }

  // Source of truth is the API, not the webhook body.
  const video = await provider.getVideo(guid).catch(() => null);
  if (!video) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await admin
    .from("video_assets")
    .update({
      status: video.status,
      duration_s: video.durationSeconds,
      ...(video.posterUrl ? { poster_url: video.posterUrl } : {}),
      ...(video.aspectRatio ? { aspect_ratio: video.aspectRatio } : {}),
    })
    .eq("playback_id", guid)
    .eq("provider", provider.name);

  return NextResponse.json({ ok: true });
}
