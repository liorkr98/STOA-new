import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { getSessionProfile } from "@/lib/db/auth";
import { getIntegrationStatus } from "@/app/actions/integrations";
import { IntegrationsPanel } from "./comps/integrations-panel";

export const metadata: Metadata = { title: "Integrations · Admin" };

export default async function AdminIntegrationsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "admin") notFound();

  const status = await getIntegrationStatus();

  return (
    <div className="mx-auto max-w-[var(--w-reading)] py-8">
      <div className="flex items-start gap-3">
        <Plug className="mt-1 h-6 w-6 text-text-mute" aria-hidden />
        <div>
          <h1 className="t-h1">Integrations</h1>
          <p className="t-body mt-1 text-text-mute">
            Configure alert delivery, verify Slack webhooks, and test Sentry after each deploy.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <IntegrationsPanel
          initialSlack={status.slack}
          initialAlertSettings={status.alertSettings}
          sentryConfigured={status.sentry.dsnConfigured}
          slackBot={status.slackBot}
        />
      </div>
    </div>
  );
}
