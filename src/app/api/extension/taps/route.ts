import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/http/errors";
import { createInterestCart } from "@/lib/interest-cart/cart";
import { ExtensionRelayStore } from "@/lib/interest-cart/relay-store";
import type { CartTap } from "@/lib/interest-cart/types";
import { interestCartOpenTo } from "@/lib/flags/interest-cart";
import { extensionPreflight } from "@/lib/extension/cors";
import { extensionRoute } from "@/lib/extension/http";

const Tap = z.object({
  id: z.uuid(),
  ticker: z.string().min(1).max(12),
  direction: z.enum(["bull", "bear"]),
  videoId: z.string().regex(/^[\w-]{11}$/).nullable(),
  videoChannel: z.string().max(128).nullable(),
  videoSeconds: z.number().int().min(0).max(86_400).nullable(),
  videoTitle: z.string().max(300).nullable().optional(),
  at: z.iso.datetime(),
});
const Body = z.object({ taps: z.array(Tap).min(1).max(100) });

/** A held tap keeps the moment it was made, within the last week; anything else is now. */
function tapMoment(iso: string, now: Date): Date {
  const at = new Date(iso);
  const age = now.getTime() - at.getTime();
  return age >= 0 && age <= 7 * 86_400_000 ? at : now;
}

/**
 * POST { taps }: the extension's taps for the signed-in reader, source
 * "extension", with the video, the channel and the moment. Each goes
 * through the same interestCart module as a tap on the site.
 */
export function POST(req: NextRequest) {
  return extensionRoute(
    req,
    { user: "required", limit: { name: "extension-taps", limit: 120, windowSeconds: 60 } },
    async (user) => {
      if (!interestCartOpenTo(user!.email ?? null)) throw new ApiError("forbidden", "The Interest Cart is not open to this account");
      const parsed = Body.safeParse(await req.json().catch(() => null));
      if (!parsed.success) throw new ApiError("validation_failed", "Expected { taps }");
      const cart = createInterestCart(new ExtensionRelayStore(), user!.id);
      const now = new Date();
      const accepted: CartTap[] = [];
      const refused: string[] = [];
      for (const t of parsed.data.taps) {
        try {
          const { tap } = await cart.addTap(t.ticker, t.direction, "extension", {
            id: t.id,
            videoId: t.videoId,
            videoChannel: t.videoChannel,
            videoSeconds: t.videoSeconds,
            videoTitle: t.videoTitle ?? null,
            at: tapMoment(t.at, now),
          });
          accepted.push(tap);
        } catch {
          refused.push(t.id);
        }
      }
      return NextResponse.json({ accepted, refused, stored: "relay" });
    },
  );
}

export function OPTIONS(req: NextRequest) {
  return extensionPreflight(req, "POST");
}
