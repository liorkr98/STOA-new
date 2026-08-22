import { getSessionProfile } from "@/lib/db/auth";
import { unreadNotificationCount } from "@/lib/db/notifications";
import { TopNav } from "@/components/layout/top-nav";
import { InstrumentSheetProvider } from "@/components/markets/instrument-sheet";
import { redirect } from "next/navigation";
import { getConsentRedirectPath } from "@/app/actions/consent";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // getSessionProfile is request-memoized, so the page below reuses this call
  // rather than making its own auth round trip.
  const profile = await getSessionProfile();

  // The consent check and the unread count are independent; they used to run in
  // series after the profile resolved.
  const [consentPath, unreadCount] = profile
    ? await Promise.all([getConsentRedirectPath(profile.id), unreadNotificationCount(profile.id)])
    : [null, 0];
  if (consentPath) redirect(consentPath);
  return (
    <InstrumentSheetProvider>
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-btn)] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
      >
        Skip to content
      </a>
      <TopNav profile={profile} unreadCount={unreadCount} />
      {/*
        The width cap lives on each page (--w-reading / --w-standard / --w-wide),
        not here: one global measure forced a market table and an article into
        the same column. The layout owns the gutter only.
      */}
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full flex-1 px-[var(--page-gutter)] py-8 outline-none"
      >
        {children}
      </main>
    </div>
    </InstrumentSheetProvider>
  );
}
