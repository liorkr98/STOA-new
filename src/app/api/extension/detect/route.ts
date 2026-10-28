import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/http/errors";
import { extensionPreflight } from "@/lib/extension/cors";
import { extensionRoute } from "@/lib/extension/http";
import { cachedVideo, detectVideo } from "@/lib/extension/detect";
import { DetectionUnavailable } from "@/lib/extension/detect/model";
import { DetectRequestSchema } from "@/lib/extension/types";

export const maxDuration = 60;

/** The stored answer only. The extension asks this first, before reading the transcript. */
export function GET(req: NextRequest) {
  return extensionRoute(req, { limit: { name: "extension-detect-read", limit: 240, windowSeconds: 3600 } }, async () => {
    const videoId = new URL(req.url).searchParams.get("videoId") ?? "";
    if (!/^[\w-]{11}$/.test(videoId)) throw new ApiError("bad_request", "videoId required");
    const entry = await cachedVideo(videoId);
    return NextResponse.json(entry ? { videoId, items: entry.items, cached: true } : { videoId, items: null, cached: false });
  });
}

/**
 * POST { videoId, language, segments }. Answers from the per-video store when
 * it can; otherwise Claude Haiku reads the transcript once, the tickers are
 * resolved and filtered in code, and only that result is stored.
 */
export function POST(req: NextRequest) {
  return extensionRoute(req, { limit: { name: "extension-detect", limit: 30, windowSeconds: 3600 } }, async () => {
    const parsed = DetectRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("validation_failed", "Expected { videoId, language, segments }");
    try {
      const { entry, cached } = await detectVideo(parsed.data);
      return NextResponse.json({ videoId: entry.videoId, items: entry.items, cached });
    } catch (err) {
      if (err instanceof DetectionUnavailable) throw new ApiError("upstream_error", err.message);
      throw err;
    }
  });
}

export function OPTIONS(req: NextRequest) {
  return extensionPreflight(req, "GET, POST");
}
