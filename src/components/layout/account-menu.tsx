"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Gear,
  PaintBrushBroad,
  SignOut,
  Sparkle,
  User,
  Wallet as WalletIcon,
  ChartLineUp,
  Users,
} from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/app/actions/auth";

interface MenuItem {
  href: string;
  label: string;
  icon: typeof User;
}

export function AccountMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const isAdmin = profile.role === "admin";

  const items: MenuItem[] = [
    { href: `/analyst/${profile.handle}`, label: "Your profile", icon: User },
    ...(isAnalyst
      ? [
          { href: "/studio", label: "Studio dashboard", icon: ChartLineUp },
          { href: "/studio/audience", label: "Audience", icon: Users },
        ]
      : [{ href: "/become-analyst", label: "Apply to publish", icon: ChartLineUp }]),
    ...(isAdmin
      ? [{ href: "/admin/applications", label: "Review applications", icon: Users }]
      : []),
    { href: "/wallet", label: "Wallet & credits", icon: WalletIcon },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/subscriptions", label: "Subscriptions", icon: Sparkle },
    { href: "/settings", label: "Settings", icon: Gear },
    { href: "/studio/branding", label: "Profile & branding", icon: PaintBrushBroad },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center gap-2 rounded-[var(--r-card)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          className="menu-pop absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]"
          style={{ background: "var(--surface)" }}
        >
          <Link
            href={`/analyst/${profile.handle}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b border-border px-4 py-3 hover:bg-surface-2"
          >
            <Avatar src={profile.avatar_url} name={profile.display_name} size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{profile.display_name}</p>
              <p className="t-meta truncate">@{profile.handle}</p>
            </div>
          </Link>

          <nav className="py-1">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.href + it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm text-text-mute transition-colors hover:bg-surface-2 hover:text-text",
                  )}
                  role="menuitem"
                >
                  <Icon size={16} />
                  {it.label}
                </Link>
              );
            })}
          </nav>

          <form action={signOut} className="border-t border-border">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
              role="menuitem"
            >
              <SignOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
