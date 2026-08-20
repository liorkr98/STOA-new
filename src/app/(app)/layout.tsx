import { getSessionProfile } from "@/lib/db/auth";
import { unreadNotificationCount } from "@/lib/db/notifications";
import { TopNav } from "@/components/layout/top-nav";
import { InstrumentSheetProvider } from "@/components/markets/instrument-sheet";
import { redirect } from "next/navigation";
import { getConsentRedirectPath } from "@/app/actions/consent";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (profile) {
    const consentPath = await getConsentRedirectPath(profile.id);
    if (consentPath) redirect(consentPath);
  }
  const unreadCount = profile ? await unreadNotificationCount(profile.id) : 0;
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
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8 outline-none"
      >
        {children}
      </main>
    </div>
    </InstrumentSheetProvider>
  );
}
