import { NextResponse } from "next/server";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";

export const dynamic = "force-dynamic";

/**
 * Returns the curated daily dispatch: lead story, secondary list, today's record.
 * ?personalized=true scopes content to followed/subscribed creators (signed-in).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const personalized = searchParams.get("personalized") === "true";

  try {
    const dispatch = await buildDispatch(personalized);
    return NextResponse.json(dispatch, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dispatch unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
