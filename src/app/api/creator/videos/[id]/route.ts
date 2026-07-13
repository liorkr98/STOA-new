import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVideoClip } from "@/lib/db/video-clips";
import { fetchTranscriptFromVtt } from "@/lib/video/bunny";

/**
 * Clip status poll for the creation flow (Part 3). Owner-only. Reports whether
 * transcoding + captions are ready and returns the current transcript so the
 * analyst can review/correct it before publish (Part 2.4).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const clip = await getVideoClip(id);
  if (!clip || clip.creator_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let transcript = clip.transcript?.trim() ?? "";
  let captionsReady = Boolean(transcript);
  if (clip.status === "ready" && !transcript) {
    const fetched = await fetchTranscriptFromVtt(clip.bunny_video_guid);
    if (fetched) {
      transcript = fetched;
      captionsReady = true;
    }
  }

  return NextResponse.json({
    id: clip.id,
    status: clip.status,
    published: clip.published_at != null,
    durationSeconds: clip.duration_seconds,
    thumbnailUrl: clip.thumbnail_url,
    captionsReady,
    transcript,
  });
}
