"use client";

import { TopNav } from "@/components/layout/top-nav";
import type { Profile } from "@/lib/types";

/**
 * A copy of the (private) app shell for fixtures: the top nav, then a <main>
 * that is the scroller, with the same padding as the real one. Surfaces that
 * measure their frame off the scroller only show their real behaviour inside
 * it; a fixture that let the window scroll was hiding exactly the bugs the
 * fixtures exist to show. Keep this in step with src/app/(private)/layout.tsx.
 */

export const FIXTURE_PROFILE = {
  id: "dev-analyst",
  handle: "dev",
  display_name: "Dev Analyst",
  role: "analyst",
  avatar_url: null,
  cover_url: null,
  bio: null,
  headline: null,
  score: 0,
  rating: 1000,
  tier: "",
  followers_count: 0,
  sub_price: null,
  report_price: null,
  verified: false,
  created_at: "2026-01-01T00:00:00.000Z",
} as Profile;

export function DevPrivateShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-app-shell
      className="flex h-[var(--app-h)] max-h-[var(--app-h)] min-w-0 flex-col overflow-hidden"
    >
      <TopNav profile={FIXTURE_PROFILE} unreadCount={0} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            className="gutter-x min-h-0 min-w-0 flex-1 overflow-y-auto py-[var(--main-pad-y)] outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
