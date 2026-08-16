"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Bell, PenLine, Search } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import { StoaLogo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { NavSearch } from "@/components/layout/nav-search";
import { signOut } from "@/app/actions/auth";

// Feed is the default landing page even though Today is listed first.
const DEFAULT_HREF = "/discover";

type NavItem = { key: string; href: string; label: string; privateArea?: boolean };
const ITEMS: NavItem[] = [
  { key: "today", href: "/home", label: "Today" },
  { key: "feed", href: DEFAULT_HREF, label: "Feed" },
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "markets", href: "/markets", label: "Markets" },
  { key: "mystoa", href: "/saved", label: "My Stoa", privateArea: true },
];

const PRIVATE_PREFIXES = ["/saved", "/studio", "/subscriptions", "/following", "/wallet", "/inbox", "/settings"];

function itemActive(pathname: string, item: NavItem) {
  if (item.privateArea) return PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
  if (item.href === DEFAULT_HREF) return pathname === DEFAULT_HREF || pathname === "/";
  return pathname.startsWith(item.href);
}

function initialsOf(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function AvatarCircle({ profile, className }: { profile: Profile; className?: string }) {
  return (
    <span className={cn("flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--ink)] text-[11px] font-medium text-[var(--paper)]", className)}>
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
      ) : (
        <span className="num">{initialsOf(profile.display_name)}</span>
      )}
    </span>
  );
}

/** Non-analyst avatar: a small menu (Settings, Sign out) since there is no public page. */
function AvatarMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Account" onClick={() => setOpen((v) => !v)} className="focus-ring rounded-full">
        <AvatarCircle profile={profile} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[10rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-paper shadow-[var(--shadow-card)]">
          <Link href="/settings" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-surface-2">
            Settings
          </Link>
          <form action={signOut} className="border-t border-border">
            <button type="submit" className="w-full px-4 py-2.5 text-left text-sm text-text-mute hover:bg-surface-2 hover:text-text">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function TopNav({ profile, unreadCount = 0 }: { profile: Profile | null; unreadCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAnalyst = profile?.role === "analyst" || profile?.role === "admin";
  // Analysts have a public page; accounts that never published do not.
  const hasPublicProfile = isAnalyst;
  const items = profile ? ITEMS : ITEMS.filter((i) => !i.privateArea);
  const logoHref = profile ? DEFAULT_HREF : "/";

  return (
    <header className="header-elevate sticky top-0 z-40 border-b border-border bg-paper">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 lg:gap-6">
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
              {hasPublicProfile ? (
                <Link href={`/analyst/${profile.handle}`} aria-label="Your public profile" className="focus-ring rounded-full">
                  <AvatarCircle profile={profile} />
                </Link>
              ) : (
                <AvatarMenu profile={profile} />
              )}
            </>
          ) : (
            <>
              <Link href="/sign-in" className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:text-text">
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
          {profile &&
            (hasPublicProfile ? (
              <Link href={`/analyst/${profile.handle}`} aria-label="Your public profile"><AvatarCircle profile={profile} /></Link>
            ) : (
              <AvatarCircle profile={profile} />
            ))}
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
                {hasPublicProfile && (
                  <Link href={`/analyst/${profile.handle}`} onClick={() => setOpen(false)} className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text">
                    Your public profile
                  </Link>
                )}
                <Link href="/inbox" onClick={() => setOpen(false)} className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text">
                  Inbox{unreadCount > 0 ? " ·" : ""}
                </Link>
                <Link href="/settings" onClick={() => setOpen(false)} className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text">
                  Settings
                </Link>
                <form action={signOut}>
                  <button type="submit" className="focus-ring w-full rounded-[var(--radius-btn)] px-3 py-2 text-left text-sm text-text-mute hover:bg-surface-2 hover:text-text">
                    Sign out
                  </button>
                </form>
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
