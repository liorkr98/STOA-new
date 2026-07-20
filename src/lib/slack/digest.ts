import { listPendingDigestItems, markDigestItemsSent } from "@/lib/db/slack-alerts";
import { formatUsd, notifySlack, slackContext, slackHeader, slackText } from "./notify";
import { DIGEST_CHANNELS } from "./settings";
import { postSystemHealth } from "./system-health";
import type { SlackChannel } from "./channels";

function digestTitle(channel: SlackChannel, count: number): string {
  const label = channel === "revenue" ? "Revenue" : "Marketing";
  const day = new Date().toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return count === 0 ? `${label} digest — ${day} (quiet day)` : `${label} digest — ${day}`;
}

function summarizeRevenue(items: Awaited<ReturnType<typeof listPendingDigestItems>>): string[] {
  const lines: string[] = [];
  let purchaseGross = 0;
  let purchaseFee = 0;
  let purchaseNet = 0;
  let purchaseCount = 0;
  let onboardCount = 0;

  for (const item of items) {
    if (item.alertKey === "report_purchase") {
      purchaseCount += 1;
      purchaseGross += Number(item.detail.grossCents ?? 0);
      purchaseFee += Number(item.detail.platformFeeCents ?? 0);
      purchaseNet += Number(item.detail.netCents ?? 0);
      lines.push(`• ${item.summaryText}`);
    } else if (item.alertKey === "creator_paypal_onboarded") {
      onboardCount += 1;
      lines.push(`• ${item.summaryText}`);
    }
  }

  const summary: string[] = [];
  if (purchaseCount > 0) {
    summary.push(
      `*${purchaseCount} report purchase${purchaseCount === 1 ? "" : "s"}* — ${formatUsd(purchaseGross)} gross, ${formatUsd(purchaseFee)} platform, ${formatUsd(purchaseNet)} creator net`,
    );
  }
  if (onboardCount > 0) {
    summary.push(`*${onboardCount} PayPal connection${onboardCount === 1 ? "" : "s"}*`);
  }

  return [...summary, ...lines.slice(0, 15)];
}

function summarizeMarketing(items: Awaited<ReturnType<typeof listPendingDigestItems>>): string[] {
  let signupCount = 0;
  let publishCount = 0;
  let firstPublishCount = 0;
  const lines: string[] = [];

  for (const item of items) {
    if (item.alertKey === "new_signup") {
      signupCount += 1;
      lines.push(`• Signup: ${item.summaryText}`);
    } else if (item.alertKey === "report_published") {
      publishCount += 1;
      if (item.detail.isFirstPublish) firstPublishCount += 1;
      lines.push(`• ${item.detail.isFirstPublish ? "First publish" : "Publish"}: ${item.summaryText}`);
    }
  }

  const summary: string[] = [];
  if (signupCount > 0) summary.push(`*${signupCount} new signup${signupCount === 1 ? "" : "s"}*`);
  if (publishCount > 0) {
    summary.push(
      `*${publishCount} publish${publishCount === 1 ? "" : "es"}*${firstPublishCount ? ` (${firstPublishCount} first)` : ""}`,
    );
  }

  return [...summary, ...lines.slice(0, 20)];
}

async function sendChannelDigest(channel: SlackChannel): Promise<{ sent: boolean; count: number }> {
  const items = await listPendingDigestItems(channel);
  if (items.length === 0) {
    return { sent: false, count: 0 };
  }

  const body =
    channel === "revenue" ? summarizeRevenue(items) : summarizeMarketing(items);

  await notifySlack({
    channel,
    text: digestTitle(channel, items.length),
    blocks: [
      slackHeader(digestTitle(channel, items.length)),
      slackText(body.join("\n")),
      slackContext(`${items.length} event${items.length === 1 ? "" : "s"} · Daily digest · UTC`),
    ],
  });

  await markDigestItemsSent(items.map((i) => i.id));
  return { sent: true, count: items.length };
}

export async function sendDailyDigests(): Promise<
  Record<SlackChannel, { sent: boolean; count: number }>
> {
  const results = {} as Record<SlackChannel, { sent: boolean; count: number }>;
  for (const channel of DIGEST_CHANNELS) {
    results[channel] = await sendChannelDigest(channel);
  }
  try {
    await postSystemHealth();
  } catch {
    // Health post is best-effort; never fail the digest run over it.
  }
  return results;
}

export async function sendDigestPreview(channel: SlackChannel): Promise<{ count: number }> {
  const items = await listPendingDigestItems(channel);
  const body =
    channel === "revenue"
      ? items.length
        ? summarizeRevenue(items)
        : ["No pending revenue events in the queue."]
      : items.length
        ? summarizeMarketing(items)
        : ["No pending marketing events in the queue."];

  await notifySlack({
    channel,
    text: `[PREVIEW] ${digestTitle(channel, items.length)}`,
    blocks: [
      slackHeader(`[PREVIEW] ${digestTitle(channel, items.length)}`),
      slackText(body.join("\n")),
      slackContext("Preview only — queue not cleared"),
    ],
  });

  return { count: items.length };
}
