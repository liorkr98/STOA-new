import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/http/errors";
import { extensionPreflight } from "@/lib/extension/cors";
import { extensionRoute } from "@/lib/extension/http";
import { cachedVideo, DetectionPaused, detectVideo } from "@/lib/extension/detect";
import { interestCartOpenTo } from "@/lib/flags/interest-cart";
import { DetectionUnavailable } from "@/lib/extension/detect/model";
import { DetectRequestSchema, MAX_TRANSCRIPT_CHARS } from "@/lib/extension/types";

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
 *
 * Guarded, because each new read spends Stoa's AI budget: a signed-in reader
 * the cart is open to (the extension's own bearer token), per-reader and
 * per-address limits, a size limit on the transcript, and a daily spending
 * cap (DETECT_DAILY_BUDGET_USD) after which only stored answers are served.
 */
export function POST(req: NextRequest) {
  return extensionRoute(
    req,
    {
      user: "required",
      limit: [
        { name: "extension-detect-user", limit: 20, windowSeconds: 3600, by: "user" },
        { name: "extension-detect-user-day", limit: 100, windowSeconds: 86_400, by: "user" },
        { name: "extension-detect-ip", limit: 40, windowSeconds: 3600, by: "ip" },
      ],
    },
    async (user) => {
      if (!interestCartOpenTo(user!.email ?? null)) throw new ApiError("forbidden", "Detection is not open to this account");
      const declared = Number(req.headers.get("content-length") ?? 0);
      if (declared > MAX_TRANSCRIPT_CHARS * 4) throw new ApiError("bad_request", "Transcript too long");
      const parsed = DetectRequestSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) throw new ApiError("validation_failed", "Expected { videoId, language, segments }");
      const chars = parsed.data.segments.reduce((n, s) => n + s.text.length, 0);
      if (chars > MAX_TRANSCRIPT_CHARS) throw new ApiError("bad_request", "Transcript too long");
      try {
        const { entry, cached } = await detectVideo(parsed.data, user!.id);
        return NextResponse.json({ videoId: entry.videoId, items: entry.items, cached });
      } catch (err) {
        if (err instanceof DetectionUnavailable) throw new ApiError("upstream_error", err.message);
        if (err instanceof DetectionPaused) throw new ApiError("rate_limited", err.message);
        throw err;
      }
    },
  );
}

export function OPTIONS(req: NextRequest) {
  return extensionPreflight(req, "GET, POST");
}
