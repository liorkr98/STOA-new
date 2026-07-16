import { webhookUrlForChannel, type SlackChannel } from "./channels";

export type SlackBlock = Record<string, unknown>;

export type SlackNotifyInput = {
  channel: SlackChannel;
  text: string;
  blocks?: SlackBlock[];
};

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.stoamarket.ai";
}

export function adminUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

export function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function slackButton(
  label: string,
  url: string,
  style: "primary" | "danger" = "primary",
): SlackBlock {
  return {
    type: "button",
    text: { type: "plain_text", text: label, emoji: true },
    url,
    style,
  };
}

export function slackHeader(title: string): SlackBlock {
  return {
    type: "header",
    text: { type: "plain_text", text: title, emoji: true },
  };
}

export function slackFields(fields: { label: string; value: string }[]): SlackBlock {
  return {
    type: "section",
    fields: fields.map(({ label, value }) => ({
      type: "mrkdwn",
      text: `*${label}:*\n${value}`,
    })),
  };
}

export function slackText(text: string): SlackBlock {
  return {
    type: "section",
    text: { type: "mrkdwn", text },
  };
}

export function slackContext(text: string): SlackBlock {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text }],
  };
}

export function slackActions(buttons: SlackBlock[]): SlackBlock {
  return { type: "actions", elements: buttons };
}

export async function notifySlack(input: SlackNotifyInput): Promise<boolean> {
  const webhookUrl = webhookUrlForChannel(input.channel);
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input.text,
      ...(input.blocks?.length ? { blocks: input.blocks } : {}),
    }),
  }).catch(() => null);

  return response?.ok ?? false;
}
