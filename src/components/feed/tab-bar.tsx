"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design/cn";

export function TabBar({
  tabs,
  active,
  param = "tab",
  /** Current URL search string (without `?`) so filter params survive tab switches. */
  query = "",
}: {
  tabs: { key: string; label: string }[];
  active: string;
  param?: string;
  query?: string;
}) {
  const pathname = usePathname();

  function hrefFor(key: string) {
    const next = new URLSearchParams(query);
    next.set(param, key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            className={cn(
              "focus-ring relative whitespace-nowrap rounded-[var(--radius-btn)] px-3 py-3 text-sm transition-colors",
              isActive ? "text-text" : "text-text-mute hover:text-text",
            )}
          >
            {t.label}
            {isActive && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-border-strong" />}
          </Link>
        );
      })}
    </div>
  );
}
