import { Suspense } from "react";
import { getSessionProfile } from "@/lib/db/auth";
import { TopNav } from "@/components/layout/top-nav";
import { NavSkeleton } from "@/components/layout/nav-skeleton";
import { Footer } from "@/components/layout/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[var(--app-h)] min-w-0 flex-col bg-bg text-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-btn)] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
      >
        Skip to content
      </a>
      <Suspense fallback={<NavSkeleton />}>
        <MarketingNav />
      </Suspense>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}

async function MarketingNav() {
  const profile = await getSessionProfile();
  return <TopNav profile={profile} />;
}
