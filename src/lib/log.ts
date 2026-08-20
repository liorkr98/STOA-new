/**
 * Minimal structured logger. Emits one JSON line per event so logs are
 * queryable (Vercel log drains, Datadog, etc.) instead of free text. Request
 * logs carry a request id, route, method, status, latency, and (for mutations)
 * the idempotency key so a single flaky-network action can be traced across
 * retries.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RequestLogFields {
  requestId: string;
  route: string;
  method: string;
  status: number;
  latencyMs: number;
  userId?: string | null;
  idempotencyKey?: string | null;
  code?: string;
  cache?: "hit" | "miss";
}

interface LogRecord {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function emit(record: LogRecord): void {
  const line = JSON.stringify(record);
  if (record.level === "error") console.error(line);
  else if (record.level === "warn") console.warn(line);
  else console.log(line);
}

export function log(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
  emit({ level, msg, ts: new Date().toISOString(), ...fields });
}

export function logRequest(fields: RequestLogFields): void {
  const level: LogLevel = fields.status >= 500 ? "error" : fields.status >= 400 ? "warn" : "info";
  emit({ level, msg: "request", ts: new Date().toISOString(), ...fields });
}

/** Short, dependency-free request id (not a security token). */
export function newRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  );
}
