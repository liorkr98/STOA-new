import * as Sentry from "@sentry/nextjs";

type CronMonitorSlug =
  | "grade-cron"
  | "refresh-ticker-metrics-cron"
  | "slack-digest-cron"
  | "maintenance-cron"
  | "video-reconcile-cron"
  | "subscription-expiry-cron";

/**
 * Monitors that declare their own schedule, so Sentry creates them on the
 * first check-in and raises a missed-run alert with no dashboard setup.
 */
const MONITOR_CONFIG: Partial<Record<CronMonitorSlug, Parameters<typeof Sentry.captureCheckIn>[1]>> = {
  "subscription-expiry-cron": {
    schedule: { type: "crontab", value: "0 0 * * *" },
    timezone: "Etc/UTC",
    checkinMargin: 60,
    maxRuntime: 5,
  },
};

export async function withCronMonitor<T>(
  monitorSlug: CronMonitorSlug,
  fn: () => Promise<T>,
): Promise<T> {
  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug,
      status: "in_progress",
    },
    MONITOR_CONFIG[monitorSlug],
  );

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
