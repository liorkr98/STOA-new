"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Compass, LineChart, Newspaper } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { LinkPending } from "@/components/layout/link-pending";

const TABS = [
  { key: "feed", href: "/feed", label: "Feed", Icon: Clapperboard },
  { key: "today", href: "/home", label: "Today", Icon: Newspaper },
  { key: "explore", href: "/explore", label: "Explore", Icon: Compass },
  { key: "markets", href: "/markets", label: "Markets", Icon: LineChart },
] as const;

function tabActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed" || pathname === "/";
  return pathname.startsWith(href);
}

/**
 * Phone chrome for the four reader surfaces. Desktop keeps the top links.
 * Explore's Feed overlay portals above this bar (z-70).
 */
export function AppTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App"
      className="app-tabs z-40 border-t border-border bg-paper md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ key, href, label, Icon }) => {
          const active = tabActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 pt-1 text-[10px] uppercase tracking-[0.14em]",
                  active ? "text-text" : "text-text-mute",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.6} aria-hidden />
                <span>{label}</span>
                {active ? (
                  <span aria-hidden className="absolute top-0 h-[1.5px] w-8 bg-[var(--ink)]" />
                ) : null}
                <LinkPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
