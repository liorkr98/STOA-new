import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/sentry/before-send";
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from "@/lib/privacy/consent";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
const replayAllowed = hasAnalyticsConsent();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  integrations: replayAllowed
    ? [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })]
    : [],
  replaysSessionSampleRate: replayAllowed ? 0.05 : 0,
  replaysOnErrorSampleRate: replayAllowed ? 1.0 : 0,
  beforeSend: sentryBeforeSend,
});

if (typeof window !== "undefined") {
  window.addEventListener(COOKIE_CONSENT_EVENT, () => {
    if (!hasAnalyticsConsent()) return;
    const client = Sentry.getClient();
    if (!client) return;
    Object.assign(client.getOptions(), {
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
    });
    client.addIntegration(Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }));
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
