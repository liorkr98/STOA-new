import { NextResponse } from "next/server";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";
import { mintExtensionSession } from "@/lib/db/extension-session";
import { interestCartOpenTo } from "@/lib/flags/interest-cart";

/**
 * Called by the site's own page (same origin, the reader's cookie) when the
 * Stoa extension is installed and not yet signed in as this reader. The page
 * passes the answer straight to the extension (externally_connectable), and
 * only to the extension's fixed id. Another site cannot read this answer:
 * there are no CORS headers here, and a request from another origin is refused.
 */
export const POST = withHandler(
  {
    route: "POST /api/extension/session",
    auth: "required",
    rateLimit: { name: "extension-session", limit: 20, windowSeconds: 3600, by: "user" },
  },
  async ({ req, user }) => {
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin) throw new ApiError("forbidden", "Same-origin only");
    const email = user?.email ?? null;
    if (!email) throw new ApiError("forbidden", "This account has no email address");
    if (!interestCartOpenTo(email)) throw new ApiError("forbidden", "The Interest Cart is not open to this account");
    const session = await mintExtensionSession(email).catch((e: Error) => {
      throw new ApiError("upstream_error", e.message);
    });
    return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  },
);
