import * as Sentry from "@sentry/nextjs";

type CronMonitorSlug =
  | "grade-cron"
  | "refresh-ticker-metrics-cron"
  | "slack-digest-cron"
  | "maintenance-cron";

export async function withCronMonitor<T>(
  monitorSlug: CronMonitorSlug,
  fn: () => Promise<T>,
): Promise<T> {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug,
    status: "in_progress",
  });

  try {
    const result = await fn();
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: "ok",
    });
    await Sentry.flush(2000);
    return result;
  } catch (error) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: "error",
    });
    await Sentry.flush(2000);
    throw error;
  }
}
