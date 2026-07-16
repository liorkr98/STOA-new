import {
  adminUrl,
  formatUsd,
  slackActions,
  slackButton,
  slackContext,
  slackFields,
  slackHeader,
  slackText,
  truncate,
} from "./notify";
import { dispatchAlert } from "./dispatch";

type AlertOpts = { forceImmediate?: boolean };

export async function alertCustomerContact(
  payload: {
    id: string;
    name: string;
    email: string;
    topic: string;
    subject: string;
    message: string;
    submittedAt: string;
  },
  opts?: AlertOpts,
) {
  await dispatchAlert(
    {
    alertKey: "customer_contact",
    text: `New customer contact from ${payload.name}`,
    digestSummary: `${payload.name} (${payload.topic})`,
    digestDetail: payload,
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
    },
    opts,
  );
}

export async function alertAnalystApplication(
  payload: {
    applicationId: string;
    displayName: string;
    handle: string;
    coverageAreas: string;
  },
  opts?: AlertOpts,
) {
  await dispatchAlert(
    {
      alertKey: "analyst_application",
    text: `New analyst application from ${payload.displayName}`,
    digestSummary: `${payload.displayName} (@${payload.handle})`,
    digestDetail: payload,
    blocks: [
      slackHeader("New analyst application"),
      slackFields([
        { label: "Applicant", value: payload.displayName },
        { label: "Handle", value: `@${payload.handle}` },
        { label: "Coverage", value: truncate(payload.coverageAreas, 200) },
      ]),
      slackActions([slackButton("Review application", adminUrl("/admin/applications"))]),
    ],
    },
    opts,
  );
}

export async function alertReportPurchase(
  payload: {
    reportId: string;
    reportTitle: string;
    analystName: string;
    analystHandle: string;
    grossCents: number;
    platformFeeCents: number;
    netCents: number;
    providerTransferId: string;
  },
  opts?: AlertOpts,
) {
  await dispatchAlert(
    {
      alertKey: "report_purchase",
    text: `Report purchase: ${formatUsd(payload.grossCents)} from ${payload.analystName}`,
    digestSummary: `${formatUsd(payload.grossCents)} — ${payload.analystName}: ${truncate(payload.reportTitle, 80)}`,
    digestDetail: payload,
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
    },
    opts,
  );
}

export async function alertCreatorPaypalOnboarded(
  payload: {
    displayName: string;
    handle: string;
    paymentsReceivable: boolean;
    emailConfirmed: boolean;
  },
  opts?: AlertOpts,
) {
  await dispatchAlert(
    {
      alertKey: "creator_paypal_onboarded",
    text: `Creator PayPal connected: ${payload.displayName}`,
    digestSummary: `${payload.displayName} (@${payload.handle}) connected PayPal`,
    digestDetail: payload,
    blocks: [
      slackHeader("Creator PayPal connected"),
      slackFields([
        { label: "Analyst", value: `${payload.displayName} (@${payload.handle})` },
        { label: "Payments receivable", value: payload.paymentsReceivable ? "Yes" : "No" },
        { label: "Email confirmed", value: payload.emailConfirmed ? "Yes" : "No" },
      ]),
      slackActions([slackButton("View profile", adminUrl(`/analyst/${payload.handle}`))]),
    ],
    },
    opts,
  );
}

export async function alertCronResult(payload: {
  job: string;
  ok: boolean;
  summary?: Record<string, unknown> | object;
  error?: string;
}) {
  const alertKey = payload.ok ? "cron_success" : "cron_failure";
  const title = payload.ok ? `${payload.job} succeeded` : `${payload.job} failed`;
  const blocks = [
    slackHeader(title),
    ...(payload.error ? [slackText(`*Error:*\n${truncate(payload.error, 1200)}`)] : []),
    ...(payload.summary
      ? [slackText(`*Summary:*\n\`\`\`${truncate(JSON.stringify(payload.summary, null, 2), 1200)}\`\`\``)]
      : []),
    slackContext(new Date().toISOString()),
  ];

  await dispatchAlert({
    alertKey,
    text: title,
    digestSummary: title,
    digestDetail: payload,
    blocks,
  });
}

export async function alertPaypalWebhookError(payload: {
  eventType: string;
  eventId: string;
  error: string;
}) {
  await dispatchAlert({
    alertKey: "paypal_webhook_error",
    text: `PayPal webhook failed: ${payload.eventType}`,
    digestSummary: `${payload.eventType}: ${truncate(payload.error, 120)}`,
    digestDetail: payload,
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

export async function alertNewSignup(
  payload: {
    userId: string;
    email: string;
    displayName: string;
    handle: string;
  },
  opts?: AlertOpts,
) {
  await dispatchAlert(
    {
      alertKey: "new_signup",
    text: `New signup: ${payload.displayName}`,
    digestSummary: `${payload.displayName} (@${payload.handle})`,
    digestDetail: payload,
    blocks: [
      slackHeader("New signup"),
      slackFields([
        { label: "Name", value: payload.displayName },
        { label: "Handle", value: `@${payload.handle}` },
        { label: "Email", value: payload.email },
      ]),
      slackActions([slackButton("View profile", adminUrl(`/analyst/${payload.handle}`))]),
    ],
    },
    opts,
  );
}

export async function alertReportPublished(
  payload: {
    reportId: string;
    title: string;
    type: string;
    ticker: string | null;
    analystName: string;
    analystHandle: string;
    isFirstPublish: boolean;
  },
  opts?: AlertOpts,
) {
  const headline = payload.isFirstPublish ? "Analyst first publish" : "New publish";
  await dispatchAlert(
    {
      alertKey: "report_published",
    text: `${headline}: ${payload.analystName}`,
    digestSummary: `${payload.analystName}: ${truncate(payload.title || "Untitled", 80)}`,
    digestDetail: payload,
    blocks: [
      slackHeader(headline),
      slackFields([
        { label: "Analyst", value: `${payload.analystName} (@${payload.analystHandle})` },
        { label: "Type", value: payload.type },
        ...(payload.ticker ? [{ label: "Ticker", value: payload.ticker }] : []),
      ]),
      slackText(`*Title:* ${truncate(payload.title || "Untitled", 200)}`),
      slackActions([
        slackButton("View report", adminUrl(`/report/${payload.reportId}`)),
        slackButton("Analyst profile", adminUrl(`/analyst/${payload.analystHandle}`)),
      ]),
    ],
    },
    opts,
  );
}
