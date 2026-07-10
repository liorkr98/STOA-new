import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { DensityToggle } from "@/components/settings/density-toggle";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const isAnalyst = profile.role === "analyst" || profile.role === "admin";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">Settings</h1>
          <p className="t-body mt-1">Update your public profile and analyst pricing.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/analyst/${profile.handle}`} className={buttonClass("secondary", "sm")}>
            View profile
          </Link>
          <Link href="/studio/branding" className={buttonClass("primary", "sm")}>
            Branding studio
          </Link>
        </div>
      </div>

      <DensityToggle />

      <ProfileSettingsForm profile={profile} />

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="t-h3">Your data</h2>
        <p className="t-body mt-1 text-text-mute">
          Download a JSON copy of your profile, consents, subscriptions, and authored reports.
        </p>
        <a
          href="/api/account/export"
          className={buttonClass("secondary", "sm", "mt-4 inline-flex")}
          download
        >
          Export my data
        </a>
      </section>

      {!isAnalyst && (
        <div className="rounded-[var(--radius-card)] border border-accent/30 bg-accent-weak/40 p-5">
          <h2 className="t-h3">Become an analyst</h2>
          <p className="t-body mt-1">
            Publish research, calls, and a verified track record. Set your own subscription and
            report pricing.
          </p>
          <Link
            href="/become-analyst"
            className={buttonClass("primary", "md", "mt-4")}
          >
            Start publishing
          </Link>
        </div>
      )}
    </div>
  );
}
