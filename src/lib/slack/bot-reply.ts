import "server-only";

const SLACK_API = "https://slack.com/api/chat.postMessage";

export function slackBotToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN?.trim() || undefined;
}

export function slackBugsChannelId(): string {
  return process.env.SLACK_BUGS_CHANNEL_ID?.trim() || "C0BHBFV4GCD";
}

type SlackPostResult = { ok: true; ts: string } | { ok: false; error?: string };

async function postSlackMessage(input: {
  channelId: string;
  text: string;
  threadTs?: string;
}): Promise<SlackPostResult> {
  const token = slackBotToken();
  if (!token) return { ok: false, error: "SLACK_BOT_TOKEN is not configured" };

  const response = await fetch(SLACK_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: input.channelId,
      text: input.text,
      ...(input.threadTs ? { thread_ts: input.threadTs } : {}),
      unfurl_links: false,
    }),
  }).catch(() => null);

  if (!response?.ok) return { ok: false, error: "Slack API request failed" };

  const body = (await response.json()) as { ok?: boolean; ts?: string; error?: string };
  if (!body.ok || !body.ts) return { ok: false, error: body.error ?? "Slack rejected the message" };
  return { ok: true, ts: body.ts };
}

export async function postSlackChannelMessage(input: {
  channelId: string;
  text: string;
}): Promise<SlackPostResult> {
  return postSlackMessage(input);
}

export async function replyInSlackThread(input: {
  channelId: string;
  threadTs: string;
  text: string;
}): Promise<SlackPostResult> {
  return postSlackMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: input.text,
  });
}
