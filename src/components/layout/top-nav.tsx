"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import { StoaLogo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function TopNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAnalyst = profile?.role === "analyst" || profile?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="focus-ring rounded-md">
            <StoaLogo />
          </Link>
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
              {isAnalyst ? (
                <Link href="/studio" className={buttonClass("secondary", "sm")}>
                  Studio
                </Link>
              ) : (
                <Link href="/become-analyst" className={buttonClass("secondary", "sm")}>
                  Become an analyst
                </Link>
              )}
              <Link href="/wallet" className="px-2 text-sm text-text-mute hover:text-text">
                Wallet
              </Link>
              <Link
                href={`/analyst/${profile.handle}`}
                className="focus-ring rounded-full"
                aria-label="Your profile"
              >
                <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
              </Link>
              <form action={signOut}>
                <button className="px-2 text-sm text-text-faint hover:text-text">Sign out</button>
              </form>
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
          className="focus-ring rounded-md p-2 text-text-mute md:hidden"
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
                className="rounded-md px-3 py-2 text-sm text-text-mute hover:bg-surface-2 hover:text-text"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {profile ? (
              <>
                <Link href="/wallet" className="rounded-md px-3 py-2 text-sm text-text-mute">
                  Wallet
                </Link>
                <Link
                  href={isAnalyst ? "/studio" : "/become-analyst"}
                  className="rounded-md px-3 py-2 text-sm text-text-mute"
                >
                  {isAnalyst ? "Studio" : "Become an analyst"}
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
