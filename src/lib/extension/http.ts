import "server-only";

import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { ApiError, errorResponse, toApiError } from "@/lib/http/errors";
import { extensionOrigin, withExtensionCors } from "@/lib/extension/cors";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

/**
 * The person behind an extension request. The extension holds its own
 * session (handed over by the site, /api/extension/session) and sends its
 * access token as a bearer token; there are no cookies on these requests.
 */
export async function extensionUser(req: NextRequest): Promise<User | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await createPublicClient().auth.getUser(token);
  return error ? null : data.user;
}

type Limit = { name: string; limit: number; windowSeconds: number; by?: "user" | "ip" };

/**
 * Runs an extension route: rate limit (per user when signed in, else per
 * address), the standard error envelope, and the extension's CORS headers on
 * every answer, errors included, so the extension can read them.
 */
export async function extensionRoute(
  req: NextRequest,
  options: { limit: Limit | Limit[]; user?: "required" | "optional" },
  fn: (user: User | null) => Promise<Response>,
): Promise<Response> {
  try {
    const user = options.user ? await extensionUser(req) : null;
    if (options.user && !extensionOrigin(req)) throw new ApiError("forbidden", "Extension only");
    if (options.user === "required" && !user) throw new ApiError("unauthorized", "Sign in to Stoa");
    for (const limit of Array.isArray(options.limit) ? options.limit : [options.limit]) {
      const by = limit.by ?? (user ? "user" : "ip");
      const id = by === "user" && user ? `user:${user.id}` : `ip:${clientIp(req)}`;
      const result = await rateLimit(limit.name, id, limit);
      if (!result.success) {
        return withExtensionCors(req, errorResponse(new ApiError("rate_limited", "Too many requests"), { headers: rateLimitHeaders(result) }));
      }
    }
    return withExtensionCors(req, await fn(user));
  } catch (err) {
    return withExtensionCors(req, errorResponse(toApiError(err)));
  }
}
