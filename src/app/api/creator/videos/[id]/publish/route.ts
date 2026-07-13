import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVideoClip, publishVideoClip } from "@/lib/db/video-clips";
import { fetchTranscriptFromVtt } from "@/lib/video/bunny";
import { runFactCheck } from "@/lib/ai/fact-check";
import { mapVerdict } from "@/lib/fact-check/claim-classification";

/**
 * Publish a video clip (Part 3.1 step 5). Same trust gate as report text: the
 * transcript runs through the existing fact-checker (Part 2.5) and publishing is
 * blocked if any claim is `unproven` or `contradicted`. Captions are mandatory
 * (Part 2.4) -- no transcript, no publish. No separate "lock" ceremony; the
 * underlying report is what's locked.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (clip.status !== "ready") {
    return NextResponse.json({ error: "video is still processing" }, { status: 409 });
  }

  // Analyst-corrected transcript wins (Part 3.1 step 2); fall back to the stored
  // transcript, then to a fresh VTT fetch. Captions are mandatory (Part 2.4).
  const body = (await req.json().catch(() => ({}))) as { transcript?: string };
  let transcript = body.transcript?.trim() || clip.transcript?.trim() || "";
  if (!transcript) {
    transcript = (await fetchTranscriptFromVtt(clip.bunny_video_guid))?.trim() ?? "";
  }
  if (!transcript) {
    return NextResponse.json(
      { error: "Captions are still generating. Try again in a moment." },
      { status: 409 },
    );
  }

  const factCheck = await runFactCheck(transcript);
  const blocking = factCheck.claims.filter((c) => {
    const verdict = mapVerdict(c.type);
    return verdict === "unproven" || verdict === "contradicted";
  });
  if (blocking.length > 0) {
    return NextResponse.json(
      {
        error: "Some spoken claims are unproven or contradicted. Fix them before publishing.",
        blockingClaims: blocking.map((c) => ({ text: c.text, verdict: mapVerdict(c.type) })),
        factCheck,
      },
      { status: 422 },
    );
  }

  const result = await publishVideoClip(clip.id, {
    transcript,
    factCheck: factCheck as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "publish failed" }, { status: 500 });
  }

  revalidatePath("/discover");
  revalidatePath("/home");
  revalidatePath("/dispatch");
  revalidatePath(`/report/${clip.report_id}`);
  return NextResponse.json({ ok: true, factCheck });
}
