"use client";

import { BrandingStudio } from "@/components/profile/branding-studio";
import { DevPrivateShell, FIXTURE_PROFILE } from "../_private-shell";

/**
 * Dev-only Storefront fixture: the branding studio inside the private shell,
 * so the form column and the live preview can be reviewed without a session.
 * Saving fails here; everything else behaves as on /studio/branding.
 */
export default function DevBrandingPage() {
  return (
    <DevPrivateShell>
      <div className="mx-auto flex max-w-[var(--w-wide)] flex-col gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Storefront</h1>
          <p className="t-body mt-2">How your public profile looks and what it costs.</p>
        </div>
        <BrandingStudio profile={FIXTURE_PROFILE} aiCredits={40} publishedReports={[]} plans={[]} />
      </div>
    </DevPrivateShell>
  );
}
