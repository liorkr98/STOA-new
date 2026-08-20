import { NextResponse } from "next/server";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";
import { withHandler } from "@/lib/http/handler";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";

export const dynamic = "force-dynamic";

/**
 * Returns the curated daily dispatch: lead story, secondary list, today's record.
 * ?personalized=true scopes content to followed/subscribed creators (signed-in).
 */
async function handleDispatch(req: Request) {
  const { searchParams } = new URL(req.url);
  const personalized = searchParams.get("personalized") === "true";

  try {
    // Public dispatch is identical for everyone, so cache it in Redis. The
    // personalized variant is user-specific and is not shared-cached.
    const dispatch = personalized
      ? await buildDispatch(true)
      : await withCache(cacheKeys.dispatch(false), 60, () => buildDispatch(false));
    return NextResponse.json(dispatch, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dispatch unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withHandler(
  {
    route: "GET /api/dispatch",
    auth: "none",
    rateLimit: { name: "dispatch", limit: 120, windowSeconds: 60, by: "user-or-ip" },
  },
  ({ req }) => handleDispatch(req),
);
