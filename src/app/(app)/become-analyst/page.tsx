import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { submitAnalystApplication } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Apply to publish" };

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-mute";
const textareaClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-mute resize-none";

async function getExistingApplication(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analyst_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export default async function BecomeAnalystPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; reapply?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role === "analyst" || profile.role === "admin") redirect("/studio/compose");

  const { submitted, reapply } = await searchParams;
  const existing = await getExistingApplication(profile.id);

  if (existing && !submitted && !reapply) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <ApplicationStatus application={existing} />
      </div>
    );
  }

  if (submitted === "1") {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <Clock size={48} weight="duotone" className="text-amber-500" />
          <h1 className="t-h2">Application submitted!</h1>
          <p className="t-body text-text-mute max-w-sm">
            We&apos;ll review your application and notify you by email and in-app notification.
            Usually within 1–2 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <h1 className="t-h1">Apply to publish research</h1>
      <p className="t-body mt-2 text-text-mute">
        Stoa is invite-quality — we review every application to keep the signal high. Once
        approved you can publish reports, price predictions, and short notes.
      </p>

      <form action={submitAnalystApplication} className="mt-8 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-5">
          <legend className="text-sm font-semibold uppercase tracking-wide text-text-mute">
            Required
          </legend>

          <div className="flex flex-col gap-2">
            <label htmlFor="why_analyst" className="text-sm font-medium">
              Why do you want to publish on Stoa?
              <span className="ml-1 text-red-500">*</span>
            </label>
            <textarea
              id="why_analyst"
              name="why_analyst"
              required
              rows={3}
              className={textareaClass}
              placeholder="Your motivation, what edge you bring to investors…"
              defaultValue={existing?.why_analyst ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="background" className="text-sm font-medium">
              What is your financial or professional background?
              <span className="ml-1 text-red-500">*</span>
            </label>
            <textarea
              id="background"
              name="background"
              required
              rows={3}
              className={textareaClass}
              placeholder="Years of experience, roles held, CFA / CPA / MBA, relevant history…"
              defaultValue={existing?.background ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="coverage_areas" className="text-sm font-medium">
              What markets or sectors will you cover?
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              id="coverage_areas"
              name="coverage_areas"
              required
              className={inputClass}
              placeholder="e.g. US equities, tech, energy, emerging markets…"
              defaultValue={existing?.coverage_areas ?? ""}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="text-sm font-semibold uppercase tracking-wide text-text-mute">
            Optional — helps us review faster
          </legend>

          <div className="flex flex-col gap-2">
            <label htmlFor="sample_thesis" className="text-sm font-medium">
              Share a quick investment thesis
            </label>
            <textarea
              id="sample_thesis"
              name="sample_thesis"
              rows={4}
              className={textareaClass}
              placeholder="A stock, sector, or macro view you hold right now and the reasoning behind it…"
              defaultValue={existing?.sample_thesis ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="linkedin_url" className="text-sm font-medium">
              LinkedIn profile URL
            </label>
            <input
              id="linkedin_url"
              name="linkedin_url"
              type="url"
              className={inputClass}
              placeholder="https://linkedin.com/in/yourname"
              defaultValue={existing?.linkedin_url ?? ""}
            />
          </div>
        </fieldset>

        <Button type="submit" size="lg">
          Submit application
        </Button>
      </form>
    </div>
  );
}

function ApplicationStatus({
  application,
}: {
  application: {
    status: string;
    submitted_at: string;
    review_note?: string | null;
  };
}) {
  if (application.status === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <Clock size={48} weight="duotone" className="text-amber-500" />
        <h2 className="t-h2">Application under review</h2>
        <p className="t-body text-text-mute max-w-sm">
          Your application was submitted on{" "}
          {new Date(application.submitted_at).toLocaleDateString()}. We&apos;ll notify you once
          it&apos;s reviewed.
        </p>
      </div>
    );
  }

  if (application.status === "approved") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <CheckCircle size={48} weight="duotone" className="text-green-500" />
        <h2 className="t-h2">You&apos;re approved!</h2>
        <p className="t-body text-text-mute">
          Your account has been upgraded. Set up your profile and publish your first report.
        </p>
        <a href="/onboarding/analyst" className={`inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-accent px-6 text-[0.95rem] font-medium text-accent-ink transition-[filter] hover:brightness-[1.06] focus-ring`}>
          Set up your profile
        </a>
      </div>
    );
  }

  // rejected
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
      <XCircle size={48} weight="duotone" className="text-red-500" />
      <h2 className="t-h2">Application not approved</h2>
      {application.review_note && (
        <p className="t-body text-text-mute max-w-sm">{application.review_note}</p>
      )}
      <p className="text-sm text-text-mute">
        You can update your answers and re-apply below.
      </p>
      <a href="/become-analyst?reapply=1" className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-border bg-surface px-4 text-sm font-medium transition hover:bg-surface-2 focus-ring">
        Update and re-apply
      </a>
    </div>
  );
}
