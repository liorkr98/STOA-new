import "server-only";

const SLACK_API = "https://slack.com/api/chat.postMessage";

export function slackBotToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN?.trim() || undefined;
}

export function slackBugsChannelId(): string {
  return process.env.SLACK_BUGS_CHANNEL_ID?.trim() || "C0BHBFV4GCD";
}

export async function replyInSlackThread(input: {
  channelId: string;
  threadTs: string;
  text: string;
}): Promise<boolean> {
  const token = slackBotToken();
  if (!token) return false;

  const response = await fetch(SLACK_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: input.channelId,
      thread_ts: input.threadTs,
      text: input.text,
      unfurl_links: false,
    }),
  }).catch(() => null);

  if (!response?.ok) return false;
  const body = (await response.json()) as { ok?: boolean };
  return body.ok === true;
}
