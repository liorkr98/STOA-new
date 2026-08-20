import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generic webhook idempotency via `processed_webhook_events` (PK = provider +
 * event_id). Returns true if this event is new (caller should process it),
 * false if already seen. Providers without a stable event id pass a synthetic
 * one such as `${resourceId}:${status}` so a re-delivered status transition is
 * only acted on once.
 */
export async function claimWebhookEvent(provider: string, eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("processed_webhook_events")
    .insert({ provider, event_id: eventId });
  if (error?.code === "23505") return false; // duplicate -> already processed
  if (error) throw error;
  return true;
}
