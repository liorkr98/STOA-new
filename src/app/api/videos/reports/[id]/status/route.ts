import { NextResponse } from "next/server";
import { getPublicClipStatus } from "@/lib/video/clip-status";
import { withHandler } from "@/lib/http/handler";

export const dynamic = "force-dynamic";

/**
 * Lightweight clip-status poll for a publication. Hits Bunny via
 * getLiveClipForReport so a finished encode appears without depending on
 * the page's Server Component re-running. Failed is only returned to the
 * author.
 */
export const GET = withHandler<{ id: string }>(
  {
    route: "GET /api/videos/reports/[id]/status",
    auth: "optional",
    rateLimit: { name: "clip-status", limit: 60, windowSeconds: 60, by: "ip" },
  },
  async ({ user, params }) => {
    const payload = await getPublicClipStatus(params.id, user?.id ?? null);
    return NextResponse.json(
      payload,
      { headers: { "Cache-Control": "no-store" } },
    );
  },
);
