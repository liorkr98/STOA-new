"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";

export type ViewRole = "investor" | "creator";

/**
 * Only rendered when an account holds both investor and creator
 * capabilities (see BACKEND_DATA_CONTRACTS.md -- role is a single
 * exclusive enum today, so this never actually mounts yet). This is the
 * one component that makes the two-sided product legible, so it lives in
 * the nav bar itself rather than being buried in settings.
 */
export function RoleSwitcher({ current }: { current: ViewRole }) {
  const router = useRouter();

  function switchTo(role: ViewRole) {
    router.push(role === "investor" ? "/home" : "/dashboard");
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-sm text-text-mute transition-colors hover:text-text"
        >
          Viewing as: <span className="font-medium text-text">{current === "investor" ? "Investor" : "Creator"}</span>
          <CaretDown size={12} weight="bold" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="popover-content ledger-card z-40 min-w-[10rem] p-1" sideOffset={6} align="start">
          {(["investor", "creator"] as ViewRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => switchTo(role)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-[var(--r-tag)] px-2.5 py-2 text-sm transition-colors hover:bg-surface-2",
                role === current ? "text-text font-medium" : "text-text-mute",
              )}
            >
              {role === "investor" ? "Investor" : "Creator"}
              {role === current && <Check size={14} weight="bold" className="text-accent" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
