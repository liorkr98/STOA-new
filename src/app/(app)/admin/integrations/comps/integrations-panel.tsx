"use client";

import { useState, useTransition } from "react";
import {
  sendDigestNow,
  testAllAlerts,
  testAllSlackChannels,
  testDigestPreview,
  testSlackBot,
  testSentry,
  testSentryError,
  testSlackChannel,
  updateAlertDeliverySetting,
} from "@/app/actions/integrations";
import type { AlertSettingView, IntegrationChannelStatus } from "@/app/actions/integrations";
import type { SlackChannel } from "@/lib/slack/channels";
import type { AlertDelivery } from "@/lib/slack/settings";
import type { AlertTestResult } from "@/lib/slack/alert-tests";
import { Button } from "@/components/ui/button";

export function IntegrationsPanel({
  initialSlack,
  initialAlertSettings,
  sentryConfigured,
  slackBot,
}: {
  initialSlack: IntegrationChannelStatus[];
  initialAlertSettings: AlertSettingView[];
  sentryConfigured: boolean;
  slackBot: {
    tokenConfigured: boolean;
    signingSecretConfigured: boolean;
    bugsChannelId: string;
  };
}) {
  const [slack, setSlack] = useState(initialSlack);
  const [alertSettings, setAlertSettings] = useState(initialAlertSettings);
  const [alertTests, setAlertTests] = useState<AlertTestResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function onDeliveryChange(alertKey: string, delivery: AlertDelivery) {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateAlertDeliverySetting(alertKey as AlertSettingView["alertKey"], delivery);
        setAlertSettings((rows) =>
          rows.map((row) => (row.alertKey === alertKey ? { ...row, delivery } : row)),
        );
        setMessage("Alert setting saved.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="t-h3">Alert delivery</h2>
        <p className="t-body mt-1 text-text-mute">
          Choose immediate Slack pings, a once-daily digest (8:00 UTC), or off. Revenue and
          marketing default to daily digest.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {alertSettings.map((row) => (
            <li
              key={row.alertKey}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-btn)] border border-border bg-bg px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.label}</p>
                <p className="t-meta">
                  #{row.channel} · {row.description}
                </p>
              </div>
              <select
                className="rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-sm"
                value={row.delivery}
                disabled={pending}
                onChange={(e) => onDeliveryChange(row.alertKey, e.target.value as AlertDelivery)}
                aria-label={`Delivery for ${row.label}`}
              >
                <option value="immediate">Immediate</option>
                <option value="digest">Daily digest</option>
                <option value="off">Off</option>
              </select>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await testDigestPreview("revenue");
                await testDigestPreview("marketing");
              }, "Digest previews sent to #revenue and #marketing.")
            }
          >
            Preview digests
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await sendDigestNow();
              }, "Daily digests sent and queue cleared.")
            }
          >
            Send digests now
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="t-h3">Sentry</h2>
        <p className="t-body mt-1 text-text-mute">
          Error monitoring. Connect Sentry to Slack in the Sentry dashboard (Integrations → Slack →
          #bugs).
        </p>
        <p className="t-meta mt-3">
          DSN configured:{" "}
          <span className={sentryConfigured ? "text-[var(--verdigris)]" : "text-[var(--rust)]"}>
            {sentryConfigured ? "Yes" : "No"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!sentryConfigured || pending}
            onClick={() =>
              run(
                () => testSentry(),
                "Info test sent to Sentry only (intentionally not posted to Slack).",
              )
            }
          >
            Send info test
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!sentryConfigured || pending}
            onClick={() =>
              run(
                () => testSentryError(),
                "Error test sent to Sentry only (intentionally not posted to Slack).",
              )
            }
          >
            Send error test
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="t-h3">STOA bot (#bugs)</h2>
        <p className="t-body mt-1 text-text-mute">
          The bot posts thread replies on error alerts in #bugs. This test posts a simulated failure
          and checks that the bot can reply in the thread.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-text-mute">
          <li>
            Bot token:{" "}
            <span
              className={
                slackBot.tokenConfigured ? "text-[var(--verdigris)]" : "text-[var(--rust)]"
              }
            >
              {slackBot.tokenConfigured ? "configured" : "missing"}
            </span>
          </li>
          <li>
            Signing secret:{" "}
            <span
              className={
                slackBot.signingSecretConfigured
                  ? "text-[var(--verdigris)]"
                  : "text-[var(--rust)]"
              }
            >
              {slackBot.signingSecretConfigured ? "configured" : "missing"}
            </span>
          </li>
          <li>
            Bugs channel ID: <code className="font-mono text-xs">{slackBot.bugsChannelId}</code>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!slackBot.tokenConfigured || pending}
            onClick={() =>
              run(
                () => testSlackBot(),
                "STOA bot test posted to #bugs. Check for a thread reply from STOA APP.",
              )
            }
          >
            Test STOA bot
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="t-h3">Slack channels</h2>
            <p className="t-body mt-1 text-text-mute">
              One incoming webhook URL per channel in Vercel env vars.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const results = await testAllSlackChannels();
                setSlack(results);
              }, "Finished testing all configured Slack channels.")
            }
          >
            Test all channels
          </Button>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {slack.map((row) => (
            <li
              key={row.channel}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-btn)] border border-border bg-bg px-4 py-3"
            >
              <div>
                <p className="font-medium">#{row.channel}</p>
                <p className="t-meta">
                  Webhook: {row.configured ? "configured" : "missing"} · Last test:{" "}
                  {row.ok ? "ok" : row.configured ? "failed" : "skipped"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!row.configured || pending}
                onClick={() =>
                  run(
                    () => testSlackChannel(row.channel as SlackChannel),
                    `Test message sent to #${row.channel}.`,
                  )
                }
              >
                Test
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="t-h3">Alert smoke tests</h2>
            <p className="t-body mt-1 text-text-mute">
              Sends a [TEST] immediate sample of each alert type (ignores digest settings).
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const results = await testAllAlerts();
                setAlertTests(results);
              }, "Finished sending alert smoke tests.")
            }
          >
            Test all alerts
          </Button>
        </div>

        {alertTests && (
          <ul className="mt-4 flex flex-col gap-2">
            {alertTests.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-btn)] border border-border bg-bg px-4 py-2.5 text-sm"
              >
                <span>{row.label}</span>
                <span className="t-meta">
                  #{row.channel} ·{" "}
                  <span className={row.ok ? "text-[var(--verdigris)]" : "text-[var(--rust)]"}>
                    {row.ok ? "ok" : "failed"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message && (
        <p className="rounded-[var(--radius-btn)] border border-border bg-surface-2 px-4 py-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
