"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/design/cn";

export type ViewRole = "investor" | "analyst";

/**
 * Analysts can view as Investor (Discover/Home) or Analyst (Studio).
 * Full dual-role accounts land with BACKEND_DATA_CONTRACTS.md; until then
 * analysts get the switcher so the two-sided product stays legible.
 */
export function RoleSwitcher({ current }: { current: ViewRole }) {
  const router = useRouter();

  function switchTo(role: ViewRole) {
    router.push(role === "investor" ? "/home" : "/studio");
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-tag)] border border-border bg-surface-2 px-3 py-1 text-sm text-text-mute transition-colors hover:text-text"
        >
          Viewing as:{" "}
          <span className="font-medium text-text">
            {current === "investor" ? "Investor" : "Analyst"}
          </span>
          <ChevronDown size={12} strokeWidth={2.5} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="popover-content ledger-card z-40 min-w-[10rem] p-1" sideOffset={6} align="start">
          {(["investor", "analyst"] as ViewRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => switchTo(role)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-[var(--r-tag)] px-2.5 py-2 text-sm transition-colors hover:bg-surface-2 focus-ring",
                role === current ? "font-medium text-text" : "text-text-mute",
              )}
            >
              {role === "investor" ? "Investor" : "Analyst"}
              {role === current && <Check size={14} strokeWidth={2.5} className="text-text" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
