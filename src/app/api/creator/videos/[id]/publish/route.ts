import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getVideoClip, publishVideoClip } from "@/lib/db/video-clips";
import { fetchTranscriptFromVtt } from "@/lib/video/bunny";
import { runFactCheck } from "@/lib/ai/fact-check";
import { mapVerdict } from "@/lib/fact-check/claim-classification";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";

/**
 * Publish a video clip (Part 3.1 step 5). Same trust gate as report text: the
 * transcript runs through the existing fact-checker (Part 2.5) and publishing is
 * blocked if any claim is `unproven` or `contradicted`. Captions are mandatory
 * (Part 2.4). Idempotent so a mobile retry cannot double-publish.
 */
export const POST = withHandler<{ id: string }>(
  {
    route: "POST /api/creator/videos/[id]/publish",
    auth: "required",
    idempotency: { scope: "video-publish" },
    rateLimit: { name: "video-publish", limit: 30, windowSeconds: 60, by: "user" },
  },
  async ({ req, user, params }) => {
    const { id } = params;

    const clip = await getVideoClip(id);
    if (!clip || clip.creator_id !== user!.id) {
      throw new ApiError("not_found", "not found");
    }
    if (clip.status !== "ready") {
      throw new ApiError("conflict", "video is still processing");
    }

    const body = (await req.json().catch(() => ({}))) as { transcript?: string };
    let transcript = body.transcript?.trim() || clip.transcript?.trim() || "";
    if (!transcript) {
      transcript = (await fetchTranscriptFromVtt(clip.bunny_video_guid))?.trim() ?? "";
    }
    if (!transcript) {
      throw new ApiError("conflict", "Captions are still generating. Try again in a moment.");
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
      throw new ApiError("internal", result.error ?? "publish failed");
    }

    revalidatePath("/feed");
    revalidatePath("/home");
    revalidatePath("/dispatch");
    revalidatePath(`/report/${clip.report_id}`);
    return NextResponse.json({ ok: true, factCheck });
  },
);
