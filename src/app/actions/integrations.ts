"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { handleBugsChannelMessage } from "@/lib/slack/bug-handler";
import { postSlackChannelMessage, slackBugsChannelId } from "@/lib/slack/bot-reply";
import { diagnoseSlackBot, ensureBotInBugsChannel, type SlackBotDiagnostics } from "@/lib/slack/diagnostics";
import { notifySlack, type SlackBlock } from "@/lib/slack/notify";
import { webhookUrlForChannel, type SlackChannel } from "@/lib/slack/channels";
import { runAllAlertTests, type AlertTestResult } from "@/lib/slack/alert-tests";
import { sendDailyDigests, sendDigestPreview } from "@/lib/slack/digest";
import {
  ALERT_DEFINITIONS,
  type AlertDelivery,
  type AlertKey,
  definitionForKey,
} from "@/lib/slack/settings";
import { listAlertSettings, updateAlertSetting } from "@/lib/db/slack-alerts";
import * as Sentry from "@sentry/nextjs";

export type AlertSettingView = {
  alertKey: AlertKey;
  label: string;
  description: string;
  channel: SlackChannel;
  delivery: AlertDelivery;
};

const CHANNELS: SlackChannel[] = [
  "support",
  "customers-ops",
  "revenue",
  "marketing",
  "bugs",
  "ops",
];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin only");
}

export type IntegrationChannelStatus = {
  channel: SlackChannel;
  configured: boolean;
  ok: boolean;
};

export type { SlackBotDiagnostics };

export async function getIntegrationStatus(): Promise<{
  sentry: { dsnConfigured: boolean };
  slackBot: SlackBotDiagnostics;
  slack: IntegrationChannelStatus[];
  alertSettings: AlertSettingView[];
}> {
  await requireAdmin();

  const settings = await listAlertSettings();
  const deliveryByKey = new Map(settings.map((s) => [s.alertKey, s.delivery]));
  const slackBot = await diagnoseSlackBot();

  return {
    sentry: {
      dsnConfigured: Boolean(
        process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim(),
      ),
    },
    slackBot,
    slack: CHANNELS.map((channel) => ({
      channel,
      configured: Boolean(webhookUrlForChannel(channel)),
      ok: false,
    })),
    alertSettings: ALERT_DEFINITIONS.map((def) => ({
      alertKey: def.key,
      label: def.label,
      description: def.description,
      channel: def.channel,
      delivery: deliveryByKey.get(def.key) ?? def.defaultDelivery,
    })),
  };
}

export async function updateAlertDeliverySetting(
  alertKey: AlertKey,
  delivery: AlertDelivery,
): Promise<void> {
  await requireAdmin();
  definitionForKey(alertKey);
  await updateAlertSetting(alertKey, delivery);
  revalidatePath("/admin/integrations");
}

export async function testDigestPreview(channel: SlackChannel): Promise<{ count: number }> {
  await requireAdmin();
  return sendDigestPreview(channel);
}

export async function sendDigestNow(): Promise<void> {
  await requireAdmin();
  await sendDailyDigests();
  revalidatePath("/admin/integrations");
}

export async function testSlackChannel(channel: SlackChannel): Promise<{ ok: boolean }> {
  await requireAdmin();

  if (!webhookUrlForChannel(channel)) {
    throw new Error(`Webhook not configured for #${channel}`);
  }

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Stoa integration test*\nChannel: \`#${channel}\`\nIf you see this, the webhook is wired correctly.`,
      },
    },
  ];

  const ok = await notifySlack({
    channel,
    text: `Stoa integration test for #${channel}`,
    blocks,
  });

  if (!ok) throw new Error(`Slack rejected the test message for #${channel}`);
  revalidatePath("/admin/integrations");
  return { ok: true };
}

export async function testAllSlackChannels(): Promise<IntegrationChannelStatus[]> {
  await requireAdmin();

  const results: IntegrationChannelStatus[] = [];
  for (const channel of CHANNELS) {
    const configured = Boolean(webhookUrlForChannel(channel));
    if (!configured) {
      results.push({ channel, configured: false, ok: false });
      continue;
    }
    try {
      await testSlackChannel(channel);
      results.push({ channel, configured: true, ok: true });
    } catch {
      results.push({ channel, configured: true, ok: false });
    }
  }
  revalidatePath("/admin/integrations");
  return results;
}

export async function testSlackBot(): Promise<{ ok: boolean }> {
  await requireAdmin();

  const joined = await ensureBotInBugsChannel();
  if (!joined.ok) {
    throw new Error(joined.error ?? "STOA bot is not in #bugs");
  }

  const channelId = slackBugsChannelId();
  const alertText =
    "[TEST] STOA bot pipeline check — simulated cron job failed (admin /admin/integrations)";

  const posted = await postSlackChannelMessage({ channelId, text: alertText });
  if (!posted.ok) {
    throw new Error(
      posted.error === "not_in_channel"
        ? "STOA bot is not in #bugs. Run /invite @STOA in the channel, then retry."
        : (posted.error ?? "STOA bot could not post to #bugs"),
    );
  }

  await handleBugsChannelMessage({
    type: "message",
    subtype: "bot_message",
    channel: channelId,
    text: alertText,
    ts: posted.ts,
  });

  revalidatePath("/admin/integrations");
  return { ok: true };
}

export async function testSentry(): Promise<{ ok: boolean }> {
  await requireAdmin();

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn?.trim()) throw new Error("Sentry DSN is not configured");

  Sentry.captureMessage("Stoa admin integration test from /admin/integrations", {
    level: "info",
    tags: { source: "admin-integrations" },
  });

  await Sentry.flush(2000);
  return { ok: true };
}

export async function testSentryError(): Promise<{ ok: boolean }> {
  await requireAdmin();

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn?.trim()) throw new Error("Sentry DSN is not configured");

  Sentry.captureException(new Error("Stoa admin Sentry error test from /admin/integrations"), {
    tags: { source: "admin-integrations", test: "true" },
  });

  await Sentry.flush(2000);
  return { ok: true };
}

export async function testAllAlerts(): Promise<AlertTestResult[]> {
  await requireAdmin();
  const results = await runAllAlertTests();
  revalidatePath("/admin/integrations");
  return results;
}
