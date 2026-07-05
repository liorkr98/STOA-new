import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canReadReport, meetsPlanRank } from "@/lib/access/can-read";
import { getVideoAsset } from "@/lib/db/videos";
import { getVideoProvider } from "@/lib/video/provider";

/**
 * Signed playback token (Part D). The paid-media gate: the viewer must pass
 * canReadReport on the linked report (and any per-block minPlanRank), then gets
 * a short-lived provider token. Without this token the video does not play --
 * RLS on video_assets protects metadata, this protects the stream itself.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(req.url);
  const assetId = url.searchParams.get("assetId");
  const minRank = Number(url.searchParams.get("minRank") ?? 0) || 0;
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  const asset = await getVideoAsset(assetId);
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (asset.status !== "ready") {
    return NextResponse.json({ error: "video not ready" }, { status: 409 });
  }

  const isOwner = user?.id === asset.creator_id;
  if (!isOwner) {
    if (asset.report_id) {
      const allowed = await canReadReport(asset.report_id);
      if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });
    }
    if (minRank > 0) {
      const meets = await meetsPlanRank(asset.creator_id, minRank);
      if (!meets) return NextResponse.json({ error: "upgrade required" }, { status: 403 });
    }
    if (!asset.report_id && minRank <= 0 && !user) {
      return NextResponse.json({ error: "sign in required" }, { status: 401 });
    }
  }

  try {
    const token = await getVideoProvider().getPlaybackToken(asset.playback_id ?? "");
    return NextResponse.json({
      iframeSrc: token.iframeSrc,
      expiresAt: token.expiresAt,
      poster: asset.poster_url,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "provider unavailable" },
      { status: 502 },
    );
  }
}
