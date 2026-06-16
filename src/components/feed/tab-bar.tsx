"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design/cn";

export function TabBar({
  tabs,
  active,
  param = "tab",
}: {
  tabs: { key: string; label: string }[];
  active: string;
  param?: string;
}) {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={`${pathname}?${param}=${t.key}`}
            className={cn(
              "relative whitespace-nowrap px-3 py-3 text-sm transition-colors",
              isActive ? "text-text" : "text-text-mute hover:text-text",
            )}
          >
            {t.label}
            {isActive && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
          </Link>
        );
      })}
    </div>
  );
}
