"use client";

import { useState, useTransition } from "react";
import { testAllSlackChannels, testSentry, testSlackChannel } from "@/app/actions/integrations";
import type { IntegrationChannelStatus } from "@/app/actions/integrations";
import type { SlackChannel } from "@/lib/slack/channels";
import { Button } from "@/components/ui/button";

export function IntegrationsPanel({
  initialSlack,
  sentryConfigured,
}: {
  initialSlack: IntegrationChannelStatus[];
  sentryConfigured: boolean;
}) {
  const [slack, setSlack] = useState(initialSlack);
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

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="t-h3">Sentry</h2>
        <p className="t-body mt-1 text-text-mute">
          Error monitoring. Connect Sentry to Slack separately in the Sentry dashboard (Integrations
          → Slack → #bugs).
        </p>
        <p className="t-meta mt-3">
          DSN configured:{" "}
          <span className={sentryConfigured ? "text-[var(--verdigris)]" : "text-[var(--rust)]"}>
            {sentryConfigured ? "Yes" : "No"}
          </span>
        </p>
        <Button
          type="button"
          className="mt-4"
          variant="secondary"
          disabled={!sentryConfigured || pending}
          onClick={() => run(() => testSentry(), "Test event sent to Sentry.")}
        >
          Send Sentry test event
        </Button>
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

      {message && (
        <p className="rounded-[var(--radius-btn)] border border-border bg-surface-2 px-4 py-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
