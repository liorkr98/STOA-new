import "server-only";

import { slackBotToken, slackBugsChannelId } from "./bot-reply";

type SlackApiResponse = {
  ok?: boolean;
  error?: string;
  user_id?: string;
  user?: string;
  team?: string;
  channel?: { name?: string; is_member?: boolean };
};

async function slackApiGet(method: string, params: Record<string, string>): Promise<SlackApiResponse> {
  const token = slackBotToken();
  if (!token) return { ok: false, error: "SLACK_BOT_TOKEN is not configured" };

  const query = new URLSearchParams(params).toString();
  const response = await fetch(`https://slack.com/api/${method}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  if (!response?.ok) return { ok: false, error: "Slack API request failed" };
  return (await response.json()) as SlackApiResponse;
}

async function slackApiPost(method: string, body: Record<string, string>): Promise<SlackApiResponse> {
  const token = slackBotToken();
  if (!token) return { ok: false, error: "SLACK_BOT_TOKEN is not configured" };

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  }).catch(() => null);

  if (!response?.ok) return { ok: false, error: "Slack API request failed" };
  return (await response.json()) as SlackApiResponse;
}

export type SlackBotDiagnostics = {
  tokenConfigured: boolean;
  signingSecretConfigured: boolean;
  bugsChannelId: string;
  authOk: boolean;
  botUserId?: string;
  botName?: string;
  team?: string;
  inBugsChannel?: boolean;
  bugsChannelName?: string;
  error?: string;
};

export async function diagnoseSlackBot(): Promise<SlackBotDiagnostics> {
  const base: SlackBotDiagnostics = {
    tokenConfigured: Boolean(slackBotToken()),
    signingSecretConfigured: Boolean(process.env.SLACK_SIGNING_SECRET?.trim()),
    bugsChannelId: slackBugsChannelId(),
    authOk: false,
  };

  if (!base.tokenConfigured) {
    return { ...base, error: "SLACK_BOT_TOKEN is not configured in Vercel Production" };
  }

  const auth = await slackApiPost("auth.test", {});
  if (!auth.ok) {
    return {
      ...base,
      error: auth.error ?? "Invalid bot token. Copy Bot User OAuth Token from Slack app OAuth page.",
    };
  }

  const info = await slackApiGet("conversations.info", { channel: base.bugsChannelId });

  return {
    ...base,
    authOk: true,
    botUserId: auth.user_id,
    botName: auth.user,
    team: auth.team,
    inBugsChannel: info.channel?.is_member ?? false,
    bugsChannelName: info.channel?.name,
    error: info.ok ? undefined : info.error,
  };
}

export async function ensureBotInBugsChannel(): Promise<{ ok: boolean; error?: string }> {
  const diagnostics = await diagnoseSlackBot();
  if (!diagnostics.authOk) {
    return { ok: false, error: diagnostics.error ?? "Bot token invalid" };
  }
  if (diagnostics.inBugsChannel) return { ok: true };

  const joined = await slackApiPost("conversations.join", { channel: slackBugsChannelId() });
  if (joined.ok) return { ok: true };
  return {
    ok: false,
    error:
      joined.error === "missing_scope"
        ? "Bot needs channels:join scope, or run /invite @STOA in #bugs"
        : (joined.error ?? "Could not join #bugs"),
  };
}
