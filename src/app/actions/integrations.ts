"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifySlack, type SlackBlock } from "@/lib/slack/notify";
import { webhookUrlForChannel, type SlackChannel } from "@/lib/slack/channels";
import { runAllAlertTests, type AlertTestResult } from "@/lib/slack/alert-tests";
import * as Sentry from "@sentry/nextjs";

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

export async function getIntegrationStatus(): Promise<{
  sentry: { dsnConfigured: boolean };
  slack: IntegrationChannelStatus[];
}> {
  await requireAdmin();

  return {
    sentry: {
      dsnConfigured: Boolean(
        process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim(),
      ),
    },
    slack: CHANNELS.map((channel) => ({
      channel,
      configured: Boolean(webhookUrlForChannel(channel)),
      ok: false,
    })),
  };
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
