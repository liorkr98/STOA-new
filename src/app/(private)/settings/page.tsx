import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { DensityToggle } from "@/components/settings/density-toggle";
import { PrivacyToggle } from "@/components/settings/privacy-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "—";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="t-body mt-2">Your account and identity.</p>
      </div>

      {/* Profile */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Profile</SectionLabel>
        <ProfileSettingsForm profile={profile} />
      </section>

      {/* Account */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Account</SectionLabel>
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-text-mute">Email</span>
            <span className="num">{email}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-4 text-sm">
            <span>Password</span>
            <button type="button" disabled className={buttonClass("secondary", "sm")}>
              Change password
            </button>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-4 text-sm">
            <span>Connected accounts</span>
            <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
              Managed by your sign-in provider
            </span>
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Display</SectionLabel>
        <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <DensityToggle />
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Privacy</SectionLabel>
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <PrivacyToggle label="Show who I follow on my public page" defaultOn={false} />
          <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
            Your purchases and library are always private.
          </p>
        </div>
      </section>

      {/* Your data */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Your data</SectionLabel>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <p className="t-body text-text-mute">
            Download a JSON copy of your profile, consents, subscriptions, and authored reports.
          </p>
          <a href="/api/account/export" className={buttonClass("secondary", "sm", "mt-4 inline-flex")} download>
            Export my data
          </a>
        </div>
      </section>

      {/* Danger zone */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Danger zone</SectionLabel>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <div>
            <p className="text-sm font-medium">Deactivate account</p>
            <p className="t-meta mt-1">Hide your profile and stop all activity. This can be undone by signing back in.</p>
          </div>
          <button type="button" disabled className={buttonClass("secondary", "sm")}>
            Deactivate
          </button>
        </div>
      </section>
    </div>
  );
}
