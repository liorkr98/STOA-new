"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLineUp,
  Gauge,
  PaintBrushBroad,
  PencilSimpleLine,
  Users,
  Gear,
  Wallet,
} from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { StoaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";

const items = [
  { href: "/studio", label: "Overview", icon: Gauge, exact: true },
  { href: "/studio/compose", label: "Compose", icon: PencilSimpleLine },
  { href: "/studio/audience", label: "Audience", icon: Users },
  { href: "/wallet", label: "Earnings", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Gear },
  { href: "/settings/branding", label: "Branding", icon: PaintBrushBroad },
];

export function StudioSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-5 md:flex">
      <Link href="/" className="px-2">
        <StoaLogo />
      </Link>
      <span className="t-eyebrow mt-1 px-2">Studio</span>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-btn)] px-3 py-2 text-sm transition-colors",
                active ? "bg-accent-weak text-accent" : "text-text-mute hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon size={18} weight={active ? "fill" : "regular"} />
              {it.label}
            </Link>
          );
        })}
        <Link
          href={`/analyst/${profile.handle}`}
          className="flex items-center gap-3 rounded-[var(--radius-btn)] px-3 py-2 text-sm text-text-mute transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChartLineUp size={18} />
          Public profile
        </Link>
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <Link href={`/analyst/${profile.handle}`} className="flex items-center gap-2">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
          <span className="flex items-center gap-1 text-sm font-medium">
            {profile.handle}
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
