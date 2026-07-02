"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { setInvestorInterests } from "@/app/actions/profile";

const MIN_REQUIRED = 3;

export function SectorPicker({ sectors, initial }: { sectors: string[]; initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(sector: string) {
    setSelected((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    );
  }

  function finish(picked: string[]) {
    start(async () => {
      await setInvestorInterests(picked);
      router.push("/discover");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sectors.map((s) => {
          const active = selected.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-between gap-2 rounded-[var(--radius-btn)] border px-4 py-3 text-sm font-medium transition-[transform,border-color,background-color] duration-[var(--dur-1)] ease-[var(--ease-out)] active:scale-[0.97]",
                active
                  ? "border-accent bg-accent-weak text-accent"
                  : "border-border text-text-mute hover:border-border-strong hover:text-text",
              )}
            >
              {s}
              {active && <Check size={14} weight="bold" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => finish([])}
          className="t-meta underline hover:no-underline"
        >
          Skip for now
        </button>
        <Button
          disabled={selected.length < MIN_REQUIRED || pending}
          onClick={() => finish(selected)}
        >
          {pending ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
