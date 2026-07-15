import {
  adminUrl,
  formatUsd,
  notifySlack,
  slackActions,
  slackButton,
  slackContext,
  slackFields,
  slackHeader,
  slackText,
  truncate,
} from "./notify";

export async function alertCustomerContact(payload: {
  id: string;
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
  submittedAt: string;
}) {
  await notifySlack({
    channel: "support",
    text: `New customer contact from ${payload.name}`,
    blocks: [
      slackHeader("New customer contact"),
      slackFields([
        { label: "Name", value: payload.name },
        { label: "Email", value: payload.email },
        { label: "Topic", value: payload.topic },
        { label: "Subject", value: truncate(payload.subject, 120) },
      ]),
      slackText(`*Message:*\n${truncate(payload.message, 1200)}`),
      slackContext(
        `Submitted ${new Date(payload.submittedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
      ),
      slackActions([slackButton("Open in Stoa", adminUrl(`/admin/contact?id=${payload.id}`))]),
    ],
  });
}

export async function alertAnalystApplication(payload: {
  applicationId: string;
  displayName: string;
  handle: string;
  coverageAreas: string;
}) {
  await notifySlack({
    channel: "customers-ops",
    text: `New analyst application from ${payload.displayName}`,
    blocks: [
      slackHeader("New analyst application"),
      slackFields([
        { label: "Applicant", value: payload.displayName },
        { label: "Handle", value: `@${payload.handle}` },
        { label: "Coverage", value: truncate(payload.coverageAreas, 200) },
      ]),
      slackActions([slackButton("Review application", adminUrl("/admin/applications"))]),
    ],
  });
}

export async function alertReportPurchase(payload: {
  reportId: string;
  reportTitle: string;
  analystName: string;
  analystHandle: string;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  providerTransferId: string;
}) {
  await notifySlack({
    channel: "revenue",
    text: `Report purchase: ${formatUsd(payload.grossCents)} from ${payload.analystName}`,
    blocks: [
      slackHeader("Report purchased"),
      slackFields([
        { label: "Amount", value: formatUsd(payload.grossCents) },
        { label: "Platform fee", value: formatUsd(payload.platformFeeCents) },
        { label: "Creator net", value: formatUsd(payload.netCents) },
        { label: "Analyst", value: `${payload.analystName} (@${payload.analystHandle})` },
      ]),
      slackText(`*Report:* ${truncate(payload.reportTitle, 200)}`),
      slackContext(`PayPal capture ${payload.providerTransferId}`),
      slackActions([slackButton("View report", adminUrl(`/report/${payload.reportId}`))]),
    ],
  });
}

export async function alertCreatorPaypalOnboarded(payload: {
  displayName: string;
  handle: string;
  paymentsReceivable: boolean;
  emailConfirmed: boolean;
}) {
  await notifySlack({
    channel: "revenue",
    text: `Creator PayPal connected: ${payload.displayName}`,
    blocks: [
      slackHeader("Creator PayPal connected"),
      slackFields([
        { label: "Analyst", value: `${payload.displayName} (@${payload.handle})` },
        { label: "Payments receivable", value: payload.paymentsReceivable ? "Yes" : "No" },
        { label: "Email confirmed", value: payload.emailConfirmed ? "Yes" : "No" },
      ]),
      slackActions([slackButton("View profile", adminUrl(`/analyst/${payload.handle}`))]),
    ],
  });
}

export async function alertCronResult(payload: {
  job: string;
  ok: boolean;
  summary?: Record<string, unknown> | object;
  error?: string;
}) {
  const channel = payload.ok ? "ops" : "bugs";
  const title = payload.ok ? `${payload.job} succeeded` : `${payload.job} failed`;
  const blocks = [
    slackHeader(title),
    ...(payload.error ? [slackText(`*Error:*\n${truncate(payload.error, 1200)}`)] : []),
    ...(payload.summary
      ? [slackText(`*Summary:*\n\`\`\`${truncate(JSON.stringify(payload.summary, null, 2), 1200)}\`\`\``)]
      : []),
    slackContext(new Date().toISOString()),
  ];

  await notifySlack({
    channel,
    text: title,
    blocks,
  });
}

export async function alertPaypalWebhookError(payload: {
  eventType: string;
  eventId: string;
  error: string;
}) {
  await notifySlack({
    channel: "bugs",
    text: `PayPal webhook failed: ${payload.eventType}`,
    blocks: [
      slackHeader("PayPal webhook error"),
      slackFields([
        { label: "Event", value: payload.eventType },
        { label: "Event ID", value: payload.eventId },
      ]),
      slackText(`*Error:*\n${truncate(payload.error, 1200)}`),
    ],
  });
}
