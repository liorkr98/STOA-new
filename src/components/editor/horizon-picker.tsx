"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { addDays, formatDistanceStrict, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/design/cn";

const PRESETS: { label: string; days: number }[] = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "18 months", days: 548 },
  { label: "2 years", days: 730 },
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function daysFromToday(date: Date): number {
  const diff = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  return Math.max(1, diff);
}

/**
 * The horizon control (docs Compose-Deep-Dive Part 5): preset chips for speed,
 * a month-grid calendar for a specific catalyst date, and a plain-language
 * confirmation so the analyst is never unsure what they picked. Past dates and
 * today are never offered (the backend rejects them). Value is days-from-today,
 * matching the publish payload's horizon_days.
 */
export function HorizonPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const resolveDate = addDays(startOfDay(new Date()), value);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(resolveDate.getFullYear(), resolveDate.getMonth(), 1),
  );

  const distance = formatDistanceStrict(resolveDate, startOfDay(new Date()));
  const dateLabel = resolveDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const today = startOfDay(new Date());
  const firstWeekday = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  function pick(days: number) {
    onChange(days);
    setOpen(false);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-text-mute">Horizon</label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-between rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm transition-colors hover:border-border-strong focus-ring"
          >
            <span className="flex items-center gap-2">
              <CalendarBlank size={14} className="text-text-faint" />
              <span className="num">{dateLabel}</span>
            </span>
            <span className="t-meta text-[11px]">{distance}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="popover-content z-50 w-[19rem] rounded-[var(--r-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
          >
            <p className="t-eyebrow mb-2">Quick horizons</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => {
                const active = value === p.days;
                return (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => pick(p.days)}
                    className={cn(
                      "rounded-[var(--radius-btn)] border px-2 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-accent bg-accent-weak text-accent"
                        : "border-border text-text-mute hover:border-border-strong hover:text-text",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="t-eyebrow">Or a specific date</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-btn)] text-text-mute hover:bg-surface-2 hover:text-text focus-ring"
                  >
                    <CaretLeft size={13} />
                  </button>
                  <span className="num min-w-[6.5rem] text-center text-xs font-medium">
                    {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-btn)] text-text-mute hover:bg-surface-2 hover:text-text focus-ring"
                  >
                    <CaretRight size={13} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="py-1 text-[10px] font-semibold text-text-faint">
                    {d}
                  </span>
                ))}
                {cells.map((date, i) => {
                  if (!date) return <span key={i} />;
                  const disabled = date <= today;
                  const selected = isSameDay(date, resolveDate);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(daysFromToday(date))}
                      className={cn(
                        "num flex h-7 items-center justify-center rounded-[var(--radius-btn)] text-xs transition-colors",
                        disabled && "cursor-not-allowed text-text-faint/50",
                        !disabled && !selected && "text-text hover:bg-surface-2",
                        selected && "bg-[var(--ink)] font-semibold text-[var(--paper)]",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 border-t border-border pt-2.5 text-[11px] text-text-mute">
              Resolves on <span className="num font-medium text-text">{dateLabel}</span>, about{" "}
              {distance} from today.
            </p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
