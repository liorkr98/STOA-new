import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ALERT_DEFINITIONS,
  type AlertDelivery,
  type AlertKey,
  definitionForKey,
} from "@/lib/slack/settings";
import type { SlackChannel } from "@/lib/slack/channels";

export type AlertSettingRow = {
  alertKey: AlertKey;
  delivery: AlertDelivery;
};

export type DigestQueueRow = {
  id: string;
  alertKey: AlertKey;
  channel: SlackChannel;
  summaryText: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export async function listAlertSettings(): Promise<AlertSettingRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("slack_alert_settings").select("alert_key, delivery");
  if (error) throw error;

  const byKey = new Map((data ?? []).map((row) => [row.alert_key, row.delivery as AlertDelivery]));

  return ALERT_DEFINITIONS.map((def) => ({
    alertKey: def.key,
    delivery: byKey.get(def.key) ?? def.defaultDelivery,
  }));
}

export async function updateAlertSetting(alertKey: AlertKey, delivery: AlertDelivery): Promise<void> {
  definitionForKey(alertKey);
  const supabase = await createClient();
  const { error } = await supabase.from("slack_alert_settings").upsert(
    {
      alert_key: alertKey,
      delivery,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "alert_key" },
  );
  if (error) throw error;
}

export async function getAlertDelivery(alertKey: AlertKey): Promise<AlertDelivery> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("slack_alert_settings")
    .select("delivery")
    .eq("alert_key", alertKey)
    .maybeSingle();
  if (error) throw error;
  if (data?.delivery) return data.delivery as AlertDelivery;
  return definitionForKey(alertKey).defaultDelivery;
}

export async function enqueueDigestItem(input: {
  alertKey: AlertKey;
  channel: SlackChannel;
  summaryText: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("slack_alert_digest_queue").insert({
    alert_key: input.alertKey,
    channel: input.channel,
    summary_text: input.summaryText,
    detail: input.detail ?? {},
  });
  if (error) throw error;
}

export async function listPendingDigestItems(channel: SlackChannel): Promise<DigestQueueRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("slack_alert_digest_queue")
    .select("id, alert_key, channel, summary_text, detail, created_at")
    .eq("channel", channel)
    .is("digested_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    alertKey: row.alert_key as AlertKey,
    channel: row.channel as SlackChannel,
    summaryText: row.summary_text,
    detail: (row.detail as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  }));
}

export async function markDigestItemsSent(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("slack_alert_digest_queue")
    .update({ digested_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}
