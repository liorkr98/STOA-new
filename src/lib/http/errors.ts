import { NextResponse } from "next/server";

/**
 * Structured error contract for API routes. A mobile client on a flaky network
 * needs to tell three cases apart: definitely-failed-safe-to-retry, unknown-do-
 * not-retry, and succeeded-but-the-reply-was-lost. HTTP status alone can't carry
 * that, so every error response also carries a stable `code` and a `retryable`
 * boolean the client keys its retry logic off of.
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "validation_failed"
  | "upstream_timeout"
  | "upstream_error"
  | "internal";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  validation_failed: 422,
  upstream_timeout: 504,
  upstream_error: 502,
  internal: 500,
};

// Whether a client may safely retry the same request. Mutations behind an
// idempotency key are safe to retry even on these; without a key the client
// should only auto-retry the codes flagged here.
const RETRYABLE_BY_CODE: Record<ApiErrorCode, boolean> = {
  bad_request: false,
  unauthorized: false,
  forbidden: false,
  not_found: false,
  conflict: false,
  rate_limited: true,
  validation_failed: false,
  upstream_timeout: true,
  upstream_error: true,
  internal: false,
};

export interface ApiErrorBody {
  ok: false;
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  requestId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }

  get retryable(): boolean {
    return RETRYABLE_BY_CODE[this.code];
  }
}

export function errorResponse(
  error: ApiError,
  opts?: { requestId?: string; headers?: HeadersInit },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    ok: false,
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    ...(opts?.requestId ? { requestId: opts.requestId } : {}),
    ...(error.details !== undefined ? { details: error.details } : {}),
  };
  return NextResponse.json(body, { status: error.status, headers: opts?.headers });
}

/** Coerce an unknown thrown value into an ApiError (defaults to internal). */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error && err.name === "AbortError") {
    return new ApiError("upstream_timeout", "Upstream request timed out");
  }
  return new ApiError("internal", "Unexpected server error");
}
