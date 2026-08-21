import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVideoProvider } from "@/lib/video/provider";
import { createVideoAsset } from "@/lib/db/videos";

/**
 * Start a direct creator upload (Part D). Analysts only. Returns the one-time
 * provider upload URL plus our asset row id; the browser uploads the file
 * straight to the provider, and the webhook flips status to ready.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "analyst" && profile?.role !== "admin") {
    return NextResponse.json({ error: "analysts only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { reportId?: string; title?: string };

  try {
    const provider = getVideoProvider();
    const upload = await provider.createDirectUpload({ creatorId: user.id, title: body.title });
    const asset = await createVideoAsset({
      provider: provider.name,
      playback_id: upload.providerAssetId,
      report_id: body.reportId ?? null,
    });
    if (!asset) return NextResponse.json({ error: "could not create asset" }, { status: 500 });
    return NextResponse.json({
      assetId: asset.id,
      uploadUrl: upload.uploadUrl,
      uploadHeaders: upload.uploadHeaders,
      // Mock provider: no real upload happens, the asset is already playable.
      mock: upload.mock ?? false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "video provider unavailable" },
      { status: 502 },
    );
  }
}
