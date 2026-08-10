"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Profile } from "@/lib/types";

type NavItem = { label: string; href: string };
type NavGroup = { key: string; label: string; analystOnly?: boolean; items: NavItem[] };

/**
 * One nav map for the whole private area, shared by the desktop rail and the
 * mobile group dropdowns. PUBLISHING is analyst-only; its sections all live
 * under /studio so the existing studio role gate keeps protecting them.
 */
const GROUPS: NavGroup[] = [
  {
    key: "reading",
    label: "Reading",
    items: [
      { label: "Library", href: "/saved" },
      { label: "Subscriptions", href: "/subscriptions" },
      { label: "Following", href: "/following" },
    ],
  },
  {
    key: "publishing",
    label: "Publishing",
    analystOnly: true,
    items: [
      { label: "Publications", href: "/studio" },
      { label: "Track record", href: "/studio/track-record" },
      { label: "Audience", href: "/studio/audience" },
      { label: "Earnings", href: "/studio/earnings" },
      { label: "Storefront", href: "/studio/branding" },
      { label: "Boost", href: "/studio/boost" },
      { label: "Polls", href: "/studio/polls" },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      { label: "Wallet", href: "/wallet" },
      { label: "Inbox", href: "/inbox" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

function visibleGroups(isAnalyst: boolean) {
  return GROUPS.filter((g) => !g.analystOnly || isAnalyst);
}

/**
 * The active section is the one whose href is the LONGEST prefix of the current
 * path. That keeps /studio/audience on "Audience" rather than also lighting up
 * "Publications" (/studio), while /studio/compose still resolves to Publications.
 */
function activeHref(pathname: string, isAnalyst: boolean) {
  let best = "";
  for (const g of visibleGroups(isAnalyst)) {
    for (const it of g.items) {
      const matches = pathname === it.href || pathname.startsWith(it.href + "/");
      if (matches && it.href.length > best.length) best = it.href;
    }
  }
  return best;
}

export function PrivateSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";
  const active = activeHref(pathname, isAnalyst);
  const groups = visibleGroups(isAnalyst);

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
      <Link
        href={`/analyst/${profile.handle}`}
        className="focus-ring flex items-center gap-2.5 rounded-[var(--radius-btn)] px-2 py-1"
      >
        <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-text">{profile.display_name}</span>
          <span className="num truncate text-xs text-text-mute">@{profile.handle}</span>
        </span>
      </Link>

      <nav className="mt-5 flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.key} className="flex flex-col gap-0.5">
            <span className="t-eyebrow px-3 pb-1">{g.label}</span>
            {g.items.map((it) => {
              const isActive = it.href === active;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-[var(--radius-btn)] px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "font-medium text-text"
                      : "text-text-mute hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-[var(--ink)]"
                    />
                  )}
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function PrivateMobileNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";
  const active = activeHref(pathname, isAnalyst);
  const groups = visibleGroups(isAnalyst);
  const [open, setOpen] = useState<string | null>(null);

  // The private layout persists across route changes, so the panel would stay
  // open after navigating. Close it whenever the path changes.
  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  return (
    <div className="sticky top-16 z-30 border-b border-border bg-surface md:hidden">
      <div className="flex items-stretch gap-1 px-3">
        {groups.map((g) => {
          const groupActive = g.items.some((it) => it.href === active);
          const isOpen = open === g.key;
          return (
            <div key={g.key} className="relative">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.key)}
                aria-expanded={isOpen}
                className={cn(
                  "focus-ring flex items-center gap-1 border-b-2 px-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors",
                  groupActive
                    ? "border-[var(--ink)] text-text"
                    : "border-transparent text-text-mute hover:text-text",
                )}
              >
                {g.label}
                <ChevronDown
                  size={12}
                  strokeWidth={2.5}
                  className={cn("transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="ledger-card absolute left-0 top-full z-40 mt-1 min-w-[12rem] p-1">
                  {g.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(null)}
                      aria-current={it.href === active ? "page" : undefined}
                      className={cn(
                        "block rounded-[var(--radius-btn)] px-2.5 py-2 text-sm transition-colors",
                        it.href === active
                          ? "font-medium text-text"
                          : "text-text-mute hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
