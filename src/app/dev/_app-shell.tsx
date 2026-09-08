"use client";

import { TopNav } from "@/components/layout/top-nav";
import { AppTabs } from "@/components/layout/app-tabs";
import { FIXTURE_PROFILE } from "./_private-shell";

/**
 * A copy of the public app shell for fixtures: the top nav, a <main> that is
 * the scroller, and the phone tab bar with its `has-app-tabs` clearance. The
 * Feed sizes itself against this shell's variables and sits inside its
 * scroller, so a fixture that mounted it bare in a scrolling window could not
 * show the one thing worth checking: whether the two scrollers agree. Keep
 * this in step with src/app/(app)/layout.tsx.
 */
export function DevAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-app-shell
      className="has-app-tabs flex h-[var(--app-h)] max-h-[var(--app-h)] min-w-0 flex-col overflow-hidden"
    >
      <TopNav profile={FIXTURE_PROFILE} unreadCount={0} />
      <main
        id="main-content"
        tabIndex={-1}
        className="gutter-x w-full min-h-0 min-w-0 flex-1 overflow-y-auto py-[var(--main-pad-y)] outline-none"
      >
        {children}
      </main>
      <AppTabs />
    </div>
  );
}
