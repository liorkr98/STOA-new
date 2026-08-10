"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Bell, PenLine } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import { StoaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { AccountMenu } from "@/components/layout/account-menu";
import { NavSearch } from "@/components/layout/nav-search";
import { signOut } from "@/app/actions/auth";

const publicLinks = [
  { href: "/dispatch", label: "Dispatch" },
  { href: "/discover", label: "Discover" },
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const appLinks = [
  { href: "/home", label: "Today" },
  { href: "/discover", label: "Discover" },
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

/** "/" must match exactly or Today would stay lit on every route. */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TopNav({
  profile,
  unreadCount = 0,
}: {
  profile: Profile | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // These routes render their own primary CTA; the nav CTA steps down so
  // exactly one filled button is visible per screen (docs/MOTION.md C.2).
  const pageHasPrimary = pathname === "/" || pathname.startsWith("/sign-");
  const isAnalyst = profile?.role === "analyst" || profile?.role === "admin";
  const links = profile ? appLinks : publicLinks;
  const logoHref = profile ? "/home" : "/";

  return (
    <header className="header-elevate sticky top-0 z-40 border-b border-border bg-paper">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 lg:gap-6">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <div className="flex shrink-0 items-center gap-3">
            <Link href={logoHref} className="focus-ring rounded-[var(--radius-btn)]">
              <StoaLogo />
            </Link>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "focus-ring relative rounded-[var(--radius-btn)] px-3 py-2 text-sm transition-colors",
                    active ? "text-text" : "text-text-mute hover:text-text",
                  )}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-border-strong" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 justify-end px-1 sm:px-2 md:justify-center">
          <NavSearch />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {profile ? (
            <>
              <Link
                href={isAnalyst ? "/studio/compose" : "/become-analyst"}
                className={buttonClass("secondary", "sm")}
              >
                <PenLine size={15} />
                {isAnalyst ? "Write" : "Become analyst"}
              </Link>
              <Link
                href="/inbox"
                className="focus-ring relative rounded-[var(--radius-btn)] p-2 text-text-mute hover:bg-surface-2 hover:text-text"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-tag)] bg-accent px-1 text-[10px] font-medium text-accent-ink">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <AccountMenu profile={profile} />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:text-text">
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonClass(pageHasPrimary ? "secondary" : "primary", "sm")}>
                Join Stoa
              </Link>
            </>
          )}
        </div>

        <button
          className="focus-ring rounded-[var(--radius-btn)] p-2 text-text-mute md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {profile ? (
              <>
                <Link
                  href={isAnalyst ? "/studio/compose" : "/become-analyst"}
                  onClick={() => setOpen(false)}
                  className={buttonClass("secondary", "sm", "w-full justify-center")}
                >
                  <PenLine size={15} />
                  {isAnalyst ? "Write" : "Become analyst"}
                </Link>
                <Link
                  href={`/analyst/${profile.handle}`}
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Your profile
                </Link>
                {isAnalyst ? (
                  <Link
                    href="/studio"
                    onClick={() => setOpen(false)}
                    className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                  >
                    Studio dashboard
                  </Link>
                ) : null}
                <Link
                  href="/inbox"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Wallet & credits
                </Link>
                <Link
                  href="/saved"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Saved
                </Link>
                <Link
                  href="/watchlist"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Watchlist
                </Link>
                <Link
                  href="/subscriptions"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Subscriptions
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Settings
                </Link>
                <Link
                  href="/studio/branding"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
                >
                  Profile & branding
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="focus-ring w-full rounded-[var(--radius-btn)] px-3 py-2 text-left text-sm text-text-faint hover:bg-surface-2 hover:text-text"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <Link href="/sign-in" className={buttonClass("secondary", "sm")}>
                  Sign in
                </Link>
                <Link href="/sign-up" className={buttonClass(pageHasPrimary ? "secondary" : "primary", "sm")}>
                  Join Stoa
                </Link>
              </div>
            )}
            <div className="px-3 py-2">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
