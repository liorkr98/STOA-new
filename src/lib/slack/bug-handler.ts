import "server-only";

import { findBugThread, insertBugThread, markBugThreadFixed } from "@/lib/db/slack-bugs";
import { replyInSlackThread, slackBugsChannelId } from "./bot-reply";

const SENTRY_ISSUE_RE =
  /https?:\/\/[^\s>|]+sentry\.io\/issues\/(\d+)[^\s>|]*/i;

export type SlackMessageEvent = {
  type: string;
  subtype?: string;
  channel: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts: string;
};

function extractSentryIssueUrl(text: string): string | null {
  const match = text.match(SENTRY_ISSUE_RE);
  return match?.[0] ?? null;
}

function isBugChannelMessage(event: SlackMessageEvent): boolean {
  if (event.type !== "message") return false;
  if (event.subtype === "message_changed" || event.subtype === "message_deleted") return false;
  if (event.channel !== slackBugsChannelId()) return false;
  if (!event.text?.trim()) return false;
  if (event.subtype === "bot_message" && !event.text.includes("sentry.io")) {
    if (event.text.includes("Stoa integration test")) return false;
  }
  return (
    event.text.includes("sentry.io/issues") ||
    event.text.includes("PayPal webhook error") ||
    event.text.includes("failed") ||
    event.text.includes("FAILED")
  );
}

export async function handleBugsChannelMessage(event: SlackMessageEvent): Promise<void> {
  if (!isBugChannelMessage(event)) return;

  const sentryUrl = extractSentryIssueUrl(event.text ?? "");

  const existing = await findBugThread(event.channel, event.ts);
  if (existing) return;

  await insertBugThread({
    channelId: event.channel,
    messageTs: event.ts,
    sentryIssueUrl: sentryUrl,
    messagePreview: (event.text ?? "").slice(0, 500),
  });

  await replyInSlackThread({
    channelId: event.channel,
    threadTs: event.ts,
    text: "Logged for triage. A Cursor agent will investigate and reply here when fixed.",
  });

  const hook = process.env.CURSOR_BUG_AGENT_WEBHOOK_URL?.trim();
  if (hook) {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: event.channel,
        threadTs: event.ts,
        sentryIssueUrl: sentryUrl,
        preview: event.text?.slice(0, 1000),
      }),
    }).catch(() => null);
  }
}

export async function postBugFixReply(input: {
  channelId: string;
  threadTs: string;
  message: string;
}): Promise<boolean> {
  const ok = await replyInSlackThread({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: input.message,
  });
  if (!ok) return false;

  await markBugThreadFixed({
    channelId: input.channelId,
    messageTs: input.threadTs,
    fixSummary: input.message,
  });

  return true;
}
