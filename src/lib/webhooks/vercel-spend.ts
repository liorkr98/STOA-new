import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeSecret } from "./secret";

/** HMAC-SHA1 hex digest Vercel puts on `x-vercel-signature`. */
export function vercelSpendSignature(rawBody: string, secret: string): string {
  return createHmac("sha1", secret).update(rawBody).digest("hex");
}

export function verifyVercelSpendSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  const expectedSecret = normalizeSecret(secret);
  const provided = normalizeSecret(header)?.toLowerCase() ?? null;
  if (!expectedSecret || !provided) return false;

  const expected = vercelSpendSignature(rawBody, expectedSecret).toLowerCase();
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export type VercelSpendEvent = {
  id: string;
  type: string;
  budgetAmount: number;
  currentSpend: number;
  thresholdPercent: number;
  scope: string;
  teamId: string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseVercelSpendBody(raw: string): VercelSpendEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const root = parsed as Record<string, unknown>;
  const payload =
    root.payload && typeof root.payload === "object"
      ? (root.payload as Record<string, unknown>)
      : {};

  const type = typeof root.type === "string" ? root.type : "";
  if (!type.startsWith("budget.")) return null;

  const budgetAmount = asNumber(payload.budgetAmount) ?? 0;
  const currentSpend = asNumber(payload.currentSpend) ?? 0;
  const thresholdPercent = asNumber(payload.thresholdPercent) ?? 0;
  const scope = typeof payload.scope === "string" ? payload.scope : "team";
  const teamId =
    (typeof payload.teamId === "string" && payload.teamId) ||
    (payload.team && typeof payload.team === "object" && typeof (payload.team as { id?: unknown }).id === "string"
      ? ((payload.team as { id: string }).id)
      : null);

  const id =
    typeof root.id === "string" && root.id
      ? root.id
      : `${type}:${scope}:${thresholdPercent}:${currentSpend}`;

  return {
    id,
    type,
    budgetAmount,
    currentSpend,
    thresholdPercent,
    scope,
    teamId,
  };
}
