import "server-only";

import { Receiver } from "@upstash/qstash";
import { isAuthorizedCron } from "@/lib/cron/auth";

/**
 * Verify a QStash consumer callback. QStash signs every delivery; we verify with
 * the signing keys. When QStash signing keys are absent we accept requests
 * carrying the CRON_SECRET bearer instead, so an operator (or the cron inline
 * path) can invoke a consumer directly during setup.
 */

let receiver: Receiver | null | undefined;

function getReceiver(): Receiver | null {
  if (receiver !== undefined) return receiver;
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const next = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
  receiver =
    current && next ? new Receiver({ currentSigningKey: current, nextSigningKey: next }) : null;
  return receiver;
}

export async function verifyJobRequest(req: Request, rawBody: string): Promise<boolean> {
  const r = getReceiver();
  if (!r) {
    // No signing keys configured: fall back to the shared cron secret.
    return isAuthorizedCron(req);
  }
  const signature = req.headers.get("upstash-signature");
  if (!signature) return isAuthorizedCron(req);
  try {
    return await r.verify({ signature, body: rawBody });
  } catch {
    return false;
  }
}
