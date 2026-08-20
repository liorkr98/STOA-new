import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/sentry/before-send";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : process.env.NODE_ENV === "development"
    ? 1.0
    : 0.1;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate,
  enableLogs: true,
  beforeSend: sentryBeforeSend,
});
