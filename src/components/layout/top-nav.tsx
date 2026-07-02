"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { Bell, PenNib } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import { StoaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { AccountMenu } from "@/components/layout/account-menu";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { signOut } from "@/app/actions/auth";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/search", label: "Search" },
];

export function TopNav({
  profile,
  unreadCount = 0,
}: {
  profile: Profile | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAnalyst = profile?.role === "analyst" || profile?.role === "admin";
  // role is a single exclusive enum today (see BACKEND_DATA_CONTRACTS.md),
  // so no account has both capabilities yet -- this always evaluates false
  // until that changes, which is the spec's own intended fallback.
  const hasInvestorRole = false;
  const hasCreatorRole = isAnalyst;
  const showRoleSwitcher = hasInvestorRole && hasCreatorRole;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="focus-ring rounded-[var(--radius-btn)]">
              <StoaLogo />
            </Link>
            {showRoleSwitcher && <RoleSwitcher current={hasCreatorRole ? "creator" : "investor"} />}
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative px-3 py-2 text-sm transition-colors",
                    active ? "text-text" : "text-text-mute hover:text-text",
                  )}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {profile ? (
            <>
              <Link
                href={isAnalyst ? "/studio/compose" : "/become-analyst"}
                className={buttonClass("primary", "sm")}
              >
                <PenNib size={15} weight="fill" />
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
              <Link href="/sign-in" className="px-3 text-sm text-text-mute hover:text-text">
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonClass("primary", "sm")}>
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
          {open ? <X size={20} /> : <List size={20} />}
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
                className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
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
                  className={buttonClass("primary", "sm", "w-full justify-center")}
                >
                  <PenNib size={15} weight="fill" />
                  {isAnalyst ? "Write" : "Become analyst"}
                </Link>
                <Link
                  href={`/analyst/${profile.handle}`}
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Your profile
                </Link>
                {isAnalyst ? (
                  <Link
                    href="/studio"
                    onClick={() => setOpen(false)}
                    className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                  >
                    Studio dashboard
                  </Link>
                ) : null}
                <Link
                  href="/inbox"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Wallet & credits
                </Link>
                <Link
                  href="/saved"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Saved
                </Link>
                <Link
                  href="/watchlist"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Watchlist
                </Link>
                <Link
                  href="/subscriptions"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Subscriptions
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Settings
                </Link>
                <Link
                  href="/settings/branding"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute"
                >
                  Profile & branding
                </Link>
                <form action={signOut}>
                  <button className="px-3 py-2 text-sm text-text-faint">Sign out</button>
                </form>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <Link href="/sign-in" className={buttonClass("secondary", "sm")}>
                  Sign in
                </Link>
                <Link href="/sign-up" className={buttonClass("primary", "sm")}>
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
