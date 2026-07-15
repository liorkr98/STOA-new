export type ContactSlackPayload = {
  id: string;
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
  submittedAt: string;
};

function siteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://stoa.app";
  return base;
}

function adminLink(id: string): string {
  return `${siteUrl()}/admin/contact?id=${id}`;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function buildContactSlackBody(payload: ContactSlackPayload) {
  const link = adminLink(payload.id);
  return {
    text: `New customer contact from ${payload.name}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "New customer contact", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Name:*\n${payload.name}` },
          { type: "mrkdwn", text: `*Email:*\n${payload.email}` },
          { type: "mrkdwn", text: `*Topic:*\n${payload.topic}` },
          { type: "mrkdwn", text: `*Subject:*\n${truncate(payload.subject, 120)}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Message:*\n${truncate(payload.message, 1200)}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Submitted ${new Date(payload.submittedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open in Stoa", emoji: true },
            url: link,
            style: "primary",
          },
        ],
      },
    ],
  };
}

export async function sendContactSlackAlert(payload: ContactSlackPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_CONTACT_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildContactSlackBody(payload)),
  }).catch(() => {});
}
