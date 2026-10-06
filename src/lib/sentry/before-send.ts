import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const AUTH_COOKIE = /sb-[a-z0-9-]+-auth-token(?:=[^;\s]*)?/gi;

export function scrubPiiText(value: string): string {
  return value.replace(EMAIL, "[email]").replace(AUTH_COOKIE, "[auth-cookie]");
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 8 || value == null) return value;
  if (typeof value === "string") return scrubPiiText(value);
  if (Array.isArray(value)) return value.map((item) => scrubUnknown(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("email") ||
        lower.includes("password") ||
        lower === "ip_address" ||
        lower === "ip" ||
        lower.includes("paypal") ||
        lower.includes("cookie") ||
        lower === "authorization"
      ) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = scrubUnknown(nested, depth + 1);
    }
    return out;
  }
  return value;
}

export function shouldDropSentryEvent(event: ErrorEvent): boolean {
  const tags = event.tags ?? {};
  if (tags.source === "admin-integrations") return true;
  if (tags.test === "true" || tags.test === true) return true;

  const message = event.message ?? event.logentry?.message ?? "";
  if (message.includes("Stoa admin integration test from /admin/integrations")) return true;
  if (message.includes("Stoa admin Sentry error test from /admin/integrations")) return true;

  return false;
}

export function sentryBeforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  void hint;
  if (shouldDropSentryEvent(event)) return null;

  if (event.message) event.message = scrubPiiText(event.message);
  if (event.logentry?.message) event.logentry.message = scrubPiiText(event.logentry.message);
  if (event.user) {
    event.user = {
      ...event.user,
      email: event.user.email ? "[email]" : event.user.email,
      ip_address: event.user.ip_address ? "[redacted]" : event.user.ip_address,
      username: event.user.username ? "[redacted]" : event.user.username,
    };
  }
  if (event.request) {
    event.request = scrubUnknown(event.request) as typeof event.request;
  }
  if (event.extra) {
    event.extra = scrubUnknown(event.extra) as typeof event.extra;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? scrubPiiText(crumb.message) : crumb.message,
      data: crumb.data ? (scrubUnknown(crumb.data) as typeof crumb.data) : crumb.data,
    }));
  }
  return event;
}
