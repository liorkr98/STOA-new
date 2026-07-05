import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideoProvider } from "@/lib/video/provider";

/**
 * Cloudflare Stream webhook (Part D). Signature-verified, idempotent: flips a
 * video_assets row to ready/errored and captures duration/poster. Uses the
 * service-role client because webhooks carry no user session. Re-delivery is
 * safe -- the update writes the same terminal state.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const provider = getVideoProvider();
  if (!provider.verifyWebhook(rawBody, req.headers.get("Webhook-Signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    uid?: string;
    readyToStream?: boolean;
    status?: { state?: string };
    duration?: number;
    thumbnail?: string;
    input?: { width?: number; height?: number };
  };
  const uid = event.uid;
  if (!uid) return NextResponse.json({ ok: true });

  const state = event.status?.state;
  const status = event.readyToStream || state === "ready" ? "ready" : state === "error" ? "errored" : "processing";

  const aspect =
    event.input?.width && event.input?.height
      ? `${event.input.width}:${event.input.height}`
      : null;

  const admin = createAdminClient();
  await admin
    .from("video_assets")
    .update({
      status,
      duration_s: event.duration ?? null,
      poster_url: event.thumbnail ?? null,
      ...(aspect ? { aspect_ratio: aspect } : {}),
    })
    .eq("playback_id", uid)
    .eq("provider", "cloudflare");

  return NextResponse.json({ ok: true });
}
