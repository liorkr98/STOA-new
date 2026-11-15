import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 24;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function newInviteToken(): { token: string; tokenHash: string; tokenPrefix: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashInviteToken(token),
    tokenPrefix: token.slice(0, 8),
  };
}

export function looksLikeInviteToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token.trim());
}
