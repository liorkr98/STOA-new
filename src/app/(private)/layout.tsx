import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { unreadNotificationCount } from "@/lib/db/notifications";
import { getConsentRedirectPath } from "@/app/actions/consent";
import { TopNav } from "@/components/layout/top-nav";
import { PrivateSidebar, PrivateMobileNav } from "@/components/layout/private-sidebar";

export const dynamic = "force-dynamic";

/**
 * The unified private area: Reading, Publishing (analyst only), and Account all
 * share this one shell -- global top nav on top, a single sidebar on the left,
 * group dropdowns on mobile. Being here requires a signed-in account; the
 * studio subtree keeps its own analyst gate in (private)/studio/layout.tsx.
 */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const consentPath = await getConsentRedirectPath(profile.id);
  if (consentPath) redirect(consentPath);

  const unreadCount = await unreadNotificationCount(profile.id);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-btn)] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
      >
        Skip to content
      </a>
      <TopNav profile={profile} unreadCount={unreadCount} />
      <div className="flex flex-1">
        <PrivateSidebar profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PrivateMobileNav profile={profile} />
          <main id="main-content" tabIndex={-1} className="flex-1 px-5 py-8 outline-none md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
