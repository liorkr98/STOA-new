import type { ErrorEvent, EventHint } from "@sentry/nextjs";

export function shouldDropSentryEvent(event: ErrorEvent, _hint?: EventHint): boolean {
  const tags = event.tags ?? {};
  if (tags.source === "admin-integrations") return true;
  if (tags.test === "true" || tags.test === true) return true;

  const message = event.message ?? event.logentry?.message ?? "";
  if (message.includes("Stoa admin integration test from /admin/integrations")) return true;
  if (message.includes("Stoa admin Sentry error test from /admin/integrations")) return true;

  return false;
}

export function sentryBeforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  return shouldDropSentryEvent(event, hint) ? null : event;
}
