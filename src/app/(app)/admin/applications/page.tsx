import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { LinkedinLogo } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { createClient } from "@/lib/supabase/server";
import { ApproveRejectButtons } from "./comps/approve-reject-buttons";

export const metadata: Metadata = { title: "Applications — Admin" };

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
  pending:  { label: "Pending",  className: "bg-amber-500/15 text-amber-500" },
  approved: { label: "Approved", className: "bg-green-500/15 text-green-600" },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-500" },
};

export default async function AdminApplicationsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "admin") notFound();

  const apps = await listApplications();
  const pending  = apps.filter((a) => a.status === "pending");
  const reviewed = apps.filter((a) => a.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="t-h1">Analyst Applications</h1>
      <p className="t-body mt-1 text-text-mute">
        {pending.length} pending · {reviewed.length} reviewed
      </p>

      {apps.length === 0 && (
        <p className="mt-12 text-center text-text-mute">No applications yet.</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {apps.map((app) => {
          const badge = statusBadge[app.status] ?? statusBadge.pending;
          const applicant = app.profiles as { handle: string; display_name: string; avatar_url?: string } | null;

          return (
            <div
              key={app.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {applicant?.avatar_url ? (
                    <span className="h-10 w-10 rounded-full overflow-hidden block">
                      {/* Avatar — external URL, next/image overkill for admin page */}
                      {/* eslint-disable-next-line */}
                      <img src={applicant.avatar_url} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {applicant?.display_name?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{applicant?.display_name ?? "Unknown"}</p>
                    <p className="text-sm text-text-mute">@{applicant?.handle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-text-mute">
                    {formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Answers */}
              <div className="flex flex-col gap-3 text-sm">
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
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-text-mute">
                  Note: {app.review_note}
                </p>
              )}

              {/* Actions */}
              {app.status === "pending" && (
                <ApproveRejectButtons applicationId={app.id} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QA({ label, answer }: { label: string; answer: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-mute">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{answer}</p>
    </div>
  );
}
