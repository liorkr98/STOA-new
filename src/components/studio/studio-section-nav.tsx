"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design/cn";

/**
 * Studio's own sections, in the page. The phone used to get these from a
 * sticky Reading / Publishing / Account bar that rode the viewport; that bar
 * is gone. Desktop already has the left rail, so this row is phone-only.
 */

const ITEMS = [
  { href: "/studio", label: "Publications" },
  { href: "/studio/insights", label: "Insights" },
  { href: "/studio/track-record", label: "Track record" },
  { href: "/studio/audience", label: "Audience" },
  { href: "/studio/branding", label: "Storefront" },
] as const;

function activeHref(pathname: string): string {
  let best = "";
  for (const it of ITEMS) {
    const matches = pathname === it.href || pathname.startsWith(`${it.href}/`);
    if (matches && it.href.length > best.length) best = it.href;
  }
  return best;
}

export function StudioSectionNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/studio/compose")) return null;

  const active = activeHref(pathname);

  return (
    <nav
      aria-label="Studio"
      className="mb-6 border-b border-border md:hidden"
    >
      <ul className="flex items-stretch gap-1 overflow-x-auto [scrollbar-width:none]">
        {ITEMS.map((it) => {
          const isActive = it.href === active;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "focus-ring flex shrink-0 items-center border-b-2 px-2.5 py-3 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                  isActive
                    ? "border-[var(--ink)] text-text"
                    : "border-transparent text-text-mute hover:text-text",
                )}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
