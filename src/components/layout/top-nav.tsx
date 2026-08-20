"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Bell, PenLine, Search } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import { StoaLogo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { NavSearch } from "@/components/layout/nav-search";

// Feed is the default landing page even though Today is listed first.
const DEFAULT_HREF = "/discover";

type NavItem = { key: string; href: string; label: string };
// The profile area is reached only through the avatar, never a nav item.
const ITEMS: NavItem[] = [
  { key: "today", href: "/home", label: "Today" },
  { key: "feed", href: DEFAULT_HREF, label: "Feed" },
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "markets", href: "/markets", label: "Markets" },
];

function itemActive(pathname: string, item: NavItem) {
  if (item.href === DEFAULT_HREF) return pathname === DEFAULT_HREF || pathname === "/";
  return pathname.startsWith(item.href);
}

function initialsOf(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function AvatarCircle({ profile, className }: { profile: Profile; className?: string }) {
  return (
    <span className={cn("flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-[var(--ink)] text-[11px] font-medium text-[var(--paper)]", className)}>
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
      ) : (
        <span className="num">{initialsOf(profile.display_name)}</span>
      )}
    </span>
  );
}

export function TopNav({ profile, unreadCount = 0 }: { profile: Profile | null; unreadCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAnalyst = profile?.role === "analyst" || profile?.role === "admin";
  // The avatar is the single entry to the owner's profile area. It opens their
  // public storefront (/profile); accounts that never published have no public
  // page, so theirs opens on Library instead.
  const hasPublicProfile = isAnalyst;
  const avatarHref = hasPublicProfile ? "/profile" : "/saved";
  const items = ITEMS;
  const logoHref = profile ? DEFAULT_HREF : "/";

  return (
    <header className="header-elevate sticky top-0 z-40 border-b border-border bg-paper">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-5 lg:gap-6">
        {/* Wordmark + nav items */}
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link href={logoHref} className="focus-ring shrink-0 rounded-[var(--radius-btn)]">
            <StoaLogo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active = itemActive(pathname, item);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "focus-ring relative rounded-[var(--radius-btn)] px-3 py-2 text-sm transition-colors",
                    active ? "text-text" : "text-text-mute hover:text-text",
                  )}
                >
                  {item.label}
                  {active && <span aria-hidden className="absolute inset-x-3 -bottom-px h-[1.5px] bg-[var(--ink)]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop right cluster */}
        <div className="hidden items-center gap-3 md:flex">
          <NavSearch />
          {profile ? (
            <>
              <Link href={isAnalyst ? "/studio/compose" : "/become-analyst"} className={buttonClass("primary", "sm")}>
                <PenLine size={15} />
                {isAnalyst ? "Compose" : "Become analyst"}
              </Link>
              <Link
                href="/inbox"
                aria-label="Notifications"
                className="focus-ring relative rounded-[var(--radius-btn)] p-2 text-text-mute hover:bg-surface-2 hover:text-text"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--ink)]" />
                )}
              </Link>
              <Link
                href={avatarHref}
                aria-label="Your profile"
                className="focus-ring rounded-full"
              >
                <AvatarCircle profile={profile} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="focus-ring rounded-[var(--radius-btn)] px-3 py-1.5 text-sm text-text-mute hover:text-text">
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonClass("primary", "sm")}>
                Join Stoa
              </Link>
            </>
          )}
        </div>

        {/* Mobile right cluster: search icon + avatar + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/search" aria-label="Search" className="focus-ring rounded-[var(--radius-btn)] p-2 text-text-mute">
            <Search size={18} />
          </Link>
          {profile && (
            <Link href={avatarHref} aria-label="Your profile">
              <AvatarCircle profile={profile} />
            </Link>
          )}
          <button
            className="focus-ring rounded-[var(--radius-btn)] p-2 text-text-mute"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer: full item list + account links */}
      {open && (
        <div className="border-t border-border bg-surface px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {profile ? (
              <>
                <Link href={isAnalyst ? "/studio/compose" : "/become-analyst"} onClick={() => setOpen(false)} className={buttonClass("primary", "sm", "w-full justify-center")}>
                  <PenLine size={15} />
                  {isAnalyst ? "Compose" : "Become analyst"}
                </Link>
                <Link href="/inbox" onClick={() => setOpen(false)} className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text">
                  Inbox{unreadCount > 0 ? " ·" : ""}
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <Link href="/sign-in" className={buttonClass("secondary", "sm")}>Sign in</Link>
                <Link href="/sign-up" className={buttonClass("primary", "sm")}>Join Stoa</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
