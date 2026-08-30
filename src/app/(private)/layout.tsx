import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionProfile, getSessionUserId } from "@/lib/db/auth";
import { unreadNotificationCount } from "@/lib/db/notifications";
import { getConsentRedirectPath } from "@/app/actions/consent";
import { TopNav } from "@/components/layout/top-nav";
import { NavSkeleton } from "@/components/layout/nav-skeleton";
import { PrivateSidebar, PrivateMobileNav } from "@/components/layout/private-sidebar";
import { HideOnCompose } from "@/components/layout/compose-chrome";
import { AppTabs } from "@/components/layout/app-tabs";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Sign-in is a local JWT read, so it is cheap. The rest of the chrome
 * (profile, consent, unread) streams in; the page does not wait for it.
 */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  return (
    <div className="has-app-tabs flex h-[var(--app-h)] max-h-[var(--app-h)] min-w-0 flex-col overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-btn)] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
      >
        Skip to content
      </a>
      <Suspense fallback={<NavSkeleton />}>
        <PrivateNav />
      </Suspense>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <HideOnCompose>
          <Suspense fallback={<div className="hidden w-60 shrink-0 border-r border-border md:block" />}>
            <PrivateRail />
          </Suspense>
        </HideOnCompose>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <HideOnCompose>
            <Suspense fallback={null}>
              <PrivateMobile />
            </Suspense>
          </HideOnCompose>
          <main id="main-content" tabIndex={-1} className="gutter-x min-h-0 min-w-0 flex-1 overflow-y-auto py-[var(--main-pad-y)] outline-none">
            {children}
          </main>
        </div>
      </div>
      <AppTabs />
    </div>
  );
}

async function privateProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const consentPath = await getConsentRedirectPath(profile.id, {
    ageAttested: Boolean(profile.age_attested_at),
  });
  if (consentPath) redirect(consentPath);
  return profile;
}

async function PrivateNav() {
  const profile = await privateProfile();
  const unreadCount = await unreadNotificationCount(profile.id);
  return <TopNav profile={profile} unreadCount={unreadCount} />;
}

async function PrivateRail() {
  const profile = await privateProfile();
  return <PrivateSidebar profile={profile} />;
}

async function PrivateMobile() {
  const profile = await privateProfile();
  return <PrivateMobileNav profile={profile} />;
}
