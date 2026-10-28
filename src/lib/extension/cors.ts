import "server-only";

import { NextResponse, type NextRequest } from "next/server";

/**
 * The Stoa extension's id, pinned by the public key in its manifest
 * (extension/wxt.config.ts), so an unpacked copy has it on every machine.
 * A Chrome Web Store copy gets its own id: add it to STOA_EXTENSION_IDS
 * (comma-separated) without a code change.
 */
export const STOA_EXTENSION_ID = "aobmhpgimghcngjppdbcglejomfgioan";

export function extensionIds(): string[] {
  const extra = (process.env.STOA_EXTENSION_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-p]{32}$/.test(s));
  return [STOA_EXTENSION_ID, ...extra];
}

/** The extension's origin when this request came from it; null for anything else. */
export function extensionOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return extensionIds().some((id) => origin === `chrome-extension://${id}`) ? origin : null;
}

/** CORS for the extension only. No other origin is let in. */
export function withExtensionCors(req: NextRequest, res: Response): Response {
  const origin = extensionOrigin(req);
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export function extensionPreflight(req: NextRequest, methods: string): Response {
  const origin = extensionOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
  });
}
