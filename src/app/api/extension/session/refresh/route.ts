import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/http/errors";
import { refreshExtensionSession } from "@/lib/db/extension-session";
import { extensionOrigin, extensionPreflight } from "@/lib/extension/cors";
import { extensionRoute } from "@/lib/extension/http";

const Body = z.object({ refreshToken: z.string().min(8).max(512) });

/** The extension renews its own session here before the access token runs out. */
export function POST(req: NextRequest) {
  return extensionRoute(req, { limit: { name: "extension-refresh", limit: 60, windowSeconds: 3600 } }, async () => {
    if (!extensionOrigin(req)) throw new ApiError("forbidden", "Extension only");
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("validation_failed", "Expected { refreshToken }");
    const session = await refreshExtensionSession(parsed.data.refreshToken);
    if (!session) throw new ApiError("unauthorized", "Sign in to Stoa again");
    return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  });
}

export function OPTIONS(req: NextRequest) {
  return extensionPreflight(req, "POST");
}
