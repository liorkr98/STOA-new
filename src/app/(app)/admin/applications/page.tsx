import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { LinkedinLogo } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { ApproveRejectButtons } from "./comps/approve-reject-buttons";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Applications · Admin" };

async function listApplications() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analyst_applications")
    .select(`
      *,
      profiles:user_id (
        handle,
        display_name,
        avatar_url
      )
    `)
    .order("submitted_at", { ascending: false });
  return data ?? [];
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-surface-2 text-[var(--pending)]" },
  approved: { label: "Approved", className: "bg-[var(--ink)] text-[var(--paper)]" },
  rejected: { label: "Rejected", className: "border border-border-strong text-text-mute" },
};

export default async function AdminApplicationsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "admin") notFound();

  const apps = await listApplications();
  const pending  = apps.filter((a) => a.status === "pending");
  const reviewed = apps.filter((a) => a.status !== "pending");

  return (
    <div className="mx-auto max-w-[var(--w-reading)] py-8">
      <h1 className="t-headline">Analyst Applications</h1>
      <p className="t-body mt-1 text-text-mute">
        {pending.length} pending · {reviewed.length} reviewed · applicants apply at{" "}
        <a href="/become-analyst" className="text-accent underline hover:no-underline">
          /become-analyst
        </a>
      </p>

      {apps.length === 0 && (
        <p className="mt-12 text-center text-text-mute">No applications yet.</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {apps.map((app) => {
          const badge = statusBadge[app.status] ?? statusBadge.pending;
          const applicant = app.profiles as { handle: string; display_name: string; avatar_url?: string } | null;

          return (
            <Card
              key={app.id}
              className="p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={applicant?.avatar_url ?? null}
                    name={applicant?.display_name ?? "?"}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold">{applicant?.display_name ?? "Unknown"}</p>
                    <p className="text-body text-text-mute">@{applicant?.handle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-chip px-2 py-0.5 text-ticker font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-ticker text-text-mute">
                    {formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Answers */}
              <div className="flex flex-col gap-3 text-body">
                <QA label="Why they want to publish" answer={app.why_analyst} />
                <QA label="Background" answer={app.background} />
                <QA label="Coverage areas" answer={app.coverage_areas} />
                {app.sample_thesis && <QA label="Sample thesis" answer={app.sample_thesis} />}
                {app.linkedin_url && (
                  <div className="flex items-center gap-2 text-text-mute">
                    <LinkedinLogo size={14} />
                    <a
                      href={app.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {app.linkedin_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Review note */}
              {app.review_note && (
                <p className="rounded-inner bg-surface-2 px-3 py-2 text-body text-text-mute">
                  Note: {app.review_note}
                </p>
              )}

              {/* Actions */}
              {app.status === "pending" && (
                <ApproveRejectButtons applicationId={app.id} />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function QA({ label, answer }: { label: string; answer: string }) {
  return (
    <div>
      <p className="text-ticker font-medium text-text-mute">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{answer}</p>
    </div>
  );
}
