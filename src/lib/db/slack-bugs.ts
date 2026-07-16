import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function findBugThread(channelId: string, messageTs: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("slack_bug_threads")
    .select("id")
    .eq("slack_channel_id", channelId)
    .eq("slack_message_ts", messageTs)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertBugThread(input: {
  channelId: string;
  messageTs: string;
  sentryIssueUrl: string | null;
  messagePreview: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("slack_bug_threads").insert({
    slack_channel_id: input.channelId,
    slack_message_ts: input.messageTs,
    sentry_issue_url: input.sentryIssueUrl,
    message_preview: input.messagePreview,
    status: "open",
  });
  if (error) throw error;
}

export async function markBugThreadFixed(input: {
  channelId: string;
  messageTs: string;
  fixSummary: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("slack_bug_threads")
    .update({
      status: "fixed",
      fixed_at: new Date().toISOString(),
      fix_summary: input.fixSummary.slice(0, 2000),
    })
    .eq("slack_channel_id", input.channelId)
    .eq("slack_message_ts", input.messageTs);
  if (error) throw error;
}
