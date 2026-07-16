export type SlackChannel =
  | "support"
  | "customers-ops"
  | "revenue"
  | "marketing"
  | "bugs"
  | "ops";

const ENV_KEYS: Record<SlackChannel, readonly string[]> = {
  support: ["SLACK_WEBHOOK_SUPPORT", "SLACK_CONTACT_WEBHOOK_URL"],
  "customers-ops": ["SLACK_WEBHOOK_CUSTOMERS_OPS"],
  revenue: ["SLACK_WEBHOOK_REVENUE"],
  marketing: ["SLACK_WEBHOOK_MARKETING"],
  bugs: ["SLACK_WEBHOOK_BUGS", "CRON_ALERT_WEBHOOK_URL"],
  ops: ["SLACK_WEBHOOK_OPS"],
};

export function webhookUrlForChannel(channel: SlackChannel): string | undefined {
  for (const key of ENV_KEYS[channel]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}
