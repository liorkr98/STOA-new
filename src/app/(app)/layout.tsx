import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { unreadNotificationCount } from "@/lib/db/notifications";
import { TopNav } from "@/components/layout/top-nav";
import { NavSkeleton } from "@/components/layout/nav-skeleton";
import { AppTabs } from "@/components/layout/app-tabs";
import { InstrumentSheetProvider } from "@/components/markets/instrument-sheet";
import { getConsentRedirectPath } from "@/app/actions/consent";

export const dynamic = "force-dynamic";

/**
 * Chrome (auth, consent, unread) used to finish before the page even started.
 * That is why a click sat still for a few seconds. The shell streams in on its
 * own; the page fetches in parallel.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <InstrumentSheetProvider>
      <div data-app-shell className="has-app-tabs flex h-[var(--app-h)] max-h-[var(--app-h)] min-w-0 flex-col overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-btn)] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
        >
          Skip to content
        </a>
        <Suspense fallback={<NavSkeleton />}>
          <AppNav />
        </Suspense>
        <main
          id="main-content"
          tabIndex={-1}
          className="gutter-x w-full min-h-0 min-w-0 flex-1 overflow-y-auto py-[var(--main-pad-y)] outline-none"
        >
          {children}
        </main>
        <AppTabs />
      </div>
    </InstrumentSheetProvider>
  );
}

async function AppNav() {
  const profile = await getSessionProfile();
  if (!profile) return <TopNav profile={null} unreadCount={0} />;
  const [consentPath, unreadCount] = await Promise.all([
    getConsentRedirectPath(profile.id, { ageAttested: Boolean(profile.age_attested_at) }),
    unreadNotificationCount(profile.id),
  ]);
  if (consentPath) redirect(consentPath);
  return <TopNav profile={profile} unreadCount={unreadCount} />;
}
