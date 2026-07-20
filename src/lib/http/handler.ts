import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { logRequest, newRequestId } from "@/lib/log";
import { ApiError, errorResponse, toApiError } from "./errors";
import {
  getStoredResponse,
  readIdempotencyKey,
  releaseIdempotencyKey,
  reserveIdempotencyKey,
  storeResponse,
} from "./idempotency";

/**
 * Single choke point for API routes. Composes request id, structured logging,
 * rate limiting, optional auth, optional Idempotency-Key replay, and consistent
 * error envelopes. Routes adopt it incrementally - nothing forces a big-bang
 * migration.
 */

export type AuthMode = "required" | "optional" | "none";
export type RateLimitBy = "user" | "ip" | "user-or-ip";

export interface HandlerConfig {
  route: string;
  auth?: AuthMode;
  rateLimit?: { name: string; limit: number; windowSeconds: number; by?: RateLimitBy };
  idempotency?: { scope: string };
}

export interface HandlerContext<P> {
  req: NextRequest;
  requestId: string;
  user: User | null;
  params: P;
}

export type HandlerFn<P> = (ctx: HandlerContext<P>) => Promise<Response>;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

function rateLimitIdentifier(by: RateLimitBy, user: User | null, req: NextRequest): string {
  const ip = clientIp(req);
  if (by === "ip") return `ip:${ip}`;
  if (by === "user") return user ? `user:${user.id}` : `ip:${ip}`;
  return user ? `user:${user.id}` : `ip:${ip}`;
}

export function withHandler<P = Record<string, never>>(
  config: HandlerConfig,
  fn: HandlerFn<P>,
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response> {
  const authMode: AuthMode = config.auth ?? "none";

  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? newRequestId();
    const start = Date.now();
    let user: User | null = null;
    let idemKey: string | null = null;

    const finish = (res: Response): Response => {
      res.headers.set("x-request-id", requestId);
      logRequest({
        requestId,
        route: config.route,
        method: req.method,
        status: res.status,
        latencyMs: Date.now() - start,
        userId: user?.id ?? null,
        idempotencyKey: idemKey,
      });
      return res;
    };

    try {
      if (authMode !== "none") {
        const supabase = await createClient();
        const {
          data: { user: authedUser },
        } = await supabase.auth.getUser();
        user = authedUser;
        if (authMode === "required" && !user) {
          throw new ApiError("unauthorized", "Sign in to continue");
        }
      }

      if (config.rateLimit) {
        const id = rateLimitIdentifier(config.rateLimit.by ?? "user-or-ip", user, req);
        const result = await rateLimit(config.rateLimit.name, id, {
          limit: config.rateLimit.limit,
          windowSeconds: config.rateLimit.windowSeconds,
        });
        if (!result.success) {
          return finish(
            errorResponse(new ApiError("rate_limited", "Too many requests"), {
              requestId,
              headers: rateLimitHeaders(result),
            }),
          );
        }
      }

      // Idempotency replay (non-money mutations). Requires auth to scope keys
      // per user; falls through when no key is supplied.
      if (config.idempotency && idemKeyEligible(req)) {
        idemKey = readIdempotencyKey(req);
        if (idemKey) {
          const scope = `${config.idempotency.scope}:${user?.id ?? "anon"}`;
          const existing = await getStoredResponse(scope, idemKey);
          if (existing && existing.status > 0) {
            return finish(
              NextResponse.json(existing.body, {
                status: existing.status,
                headers: { "Idempotent-Replay": "true" },
              }),
            );
          }
          const reserved = await reserveIdempotencyKey(scope, idemKey);
          if (!reserved && !existing) {
            throw new ApiError("conflict", "A request with this Idempotency-Key is in progress");
          }

          const params = ((await ctx?.params) ?? {}) as P;
          try {
            const res = await fn({ req, requestId, user, params });
            if (res.status < 500) {
              const body = await res
                .clone()
                .json()
                .catch(() => null);
              await storeResponse(scope, idemKey, { status: res.status, body });
            } else {
              await releaseIdempotencyKey(scope, idemKey);
            }
            return finish(res);
          } catch (err) {
            await releaseIdempotencyKey(scope, idemKey);
            throw err;
          }
        }
      }

      const params = ((await ctx?.params) ?? {}) as P;
      const res = await fn({ req, requestId, user, params });
      return finish(res);
    } catch (err) {
      const apiError = toApiError(err);
      return finish(errorResponse(apiError, { requestId }));
    }
  };
}

function idemKeyEligible(req: NextRequest): boolean {
  return req.method === "POST" || req.method === "PUT" || req.method === "PATCH";
}
