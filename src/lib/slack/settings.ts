import type { SlackChannel } from "./channels";

export type AlertDelivery = "immediate" | "digest" | "off";

export type AlertKey =
  | "customer_contact"
  | "analyst_application"
  | "report_purchase"
  | "creator_paypal_onboarded"
  | "new_signup"
  | "report_published"
  | "cron_failure"
  | "cron_success"
  | "paypal_webhook_error";

export type AlertDefinition = {
  key: AlertKey;
  label: string;
  description: string;
  channel: SlackChannel;
  defaultDelivery: AlertDelivery;
};

export const ALERT_DEFINITIONS: AlertDefinition[] = [
  {
    key: "customer_contact",
    label: "Customer contact",
    description: "Someone submits the contact form",
    channel: "support",
    defaultDelivery: "immediate",
  },
  {
    key: "analyst_application",
    label: "Analyst application",
    description: "New application to publish on Stoa",
    channel: "customers-ops",
    defaultDelivery: "immediate",
  },
  {
    key: "report_purchase",
    label: "Report purchase",
    description: "PayPal report unlock completed",
    channel: "revenue",
    defaultDelivery: "digest",
  },
  {
    key: "creator_paypal_onboarded",
    label: "Creator PayPal connected",
    description: "Analyst finished PayPal onboarding",
    channel: "revenue",
    defaultDelivery: "digest",
  },
  {
    key: "new_signup",
    label: "New signup",
    description: "Investor or analyst account created",
    channel: "marketing",
    defaultDelivery: "digest",
  },
  {
    key: "report_published",
    label: "Report published",
    description: "Analyst publishes research, a call, or a short post",
    channel: "marketing",
    defaultDelivery: "digest",
  },
  {
    key: "cron_failure",
    label: "Cron job failed",
    description: "Scheduled job error (grading, metrics, etc.)",
    channel: "bugs",
    defaultDelivery: "immediate",
  },
  {
    key: "cron_success",
    label: "Cron job succeeded",
    description: "Nightly grade job OK ping",
    channel: "ops",
    defaultDelivery: "immediate",
  },
  {
    key: "paypal_webhook_error",
    label: "PayPal webhook error",
    description: "PayPal webhook handler threw",
    channel: "bugs",
    defaultDelivery: "immediate",
  },
];

export const DIGEST_CHANNELS: SlackChannel[] = ["revenue", "marketing"];

export function definitionForKey(key: AlertKey): AlertDefinition {
  const found = ALERT_DEFINITIONS.find((d) => d.key === key);
  if (!found) throw new Error(`Unknown alert key: ${key}`);
  return found;
}

export function deliveryOptions(): { value: AlertDelivery; label: string }[] {
  return [
    { value: "immediate", label: "Immediate" },
    { value: "digest", label: "Daily digest" },
    { value: "off", label: "Off" },
  ];
}
