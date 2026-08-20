"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Direction } from "@/lib/types";
import { SealStamp } from "@/components/ui/seal-stamp";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

export type InboxCategory = "calls" | "publications" | "money" | "audience" | "social";

export interface InboxItem {
  id: string;
  zone: "needs" | "good";
  category: InboxCategory;
  title: string;
  timeLabel: string;
  read: boolean;
  href: string | null;
  /** Action label: a real button in "needs", a quiet link in "good". */
  action: string | null;
  danger?: boolean;
  /** Already-acted confirmation (shown once in "good"). */
  confirmed?: boolean;
  // Resolved-call variant
  ticker?: string | null;
  direction?: Direction | null;
  entryExit?: string | null;
  sealStatus?: "hit" | "miss" | null;
  // Own-call variant
  scoreDelta?: string | null;
  /** True for placeholder demo items (dev only). */
  demo?: boolean;
}

const CHIPS: { key: "all" | InboxCategory; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "calls", label: "CALLS" },
  { key: "publications", label: "PUBLICATIONS" },
  { key: "money", label: "MONEY" },
  { key: "audience", label: "AUDIENCE" },
  { key: "social", label: "SOCIAL" },
];

const READING_PREFS = [
  "Publications from subscriptions",
  "Publications from follows",
  "Call resolutions",
  "Price target hits",
  "Subscription renewals",
  "New followers",
  "Product news",
];
const RESEARCH_PREFS = [
  "Your call resolutions",
  "Calls approaching horizon",
  "New subscribers",
  "Report unlocks",
  "Comments",
  "Payouts",
];

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors focus-ring",
        on ? "border-[var(--ink)] bg-[var(--ink)]" : "border-border bg-surface-2",
      )}
    >
      <span
        className="absolute top-0.5 rounded-full bg-[var(--paper)] transition-transform"
        style={{ height: 14, width: 14, left: 2, transform: on ? "translateX(16px)" : "none" }}
      />
    </button>
  );
}

function PrefGroup({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <div className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">{title}</div>
      <div className="mt-2 flex flex-col">
        <div className="num flex items-center justify-end gap-6 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">
          <span className="w-9 text-center">In-app</span>
          <span className="w-9 text-center">Email</span>
        </div>
        {rows.map((r) => (
          <div key={r} className="flex items-center justify-between gap-4 border-t border-border py-2.5 text-sm">
            <span>{r}</span>
            <div className="flex items-center gap-6">
              <Toggle defaultOn />
              <Toggle />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ it, onDismiss }: { it: InboxItem; onDismiss: (id: string) => void }) {
  const needs = it.zone === "needs";
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-[var(--radius-card)] py-4 pl-5 pr-4",
        needs ? "border border-border bg-surface" : "border-b border-border",
        needs && "border-l-2 border-l-[var(--ink)]",
        it.danger && "border-l-[var(--rust)]",
      )}
    >
      {!it.read && <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink)]" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("text-[15px] leading-snug", it.danger && "text-[var(--rust)]")}>
              {it.confirmed && (
                <Check size={14} strokeWidth={2} className="mr-1.5 inline text-[var(--verdigris)]" aria-hidden />
              )}
              {it.title}
            </p>
            {it.entryExit && (
              <p className="num mt-1 text-[12px] text-text-mute">{it.entryExit}</p>
            )}
            {it.scoreDelta && (
              <p className="num mt-1 text-[11px] uppercase tracking-[0.14em] text-text-mute">{it.scoreDelta}</p>
            )}
            <div className="mt-1.5 flex items-center gap-3">
              <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{it.timeLabel}</span>
              {it.action &&
                (needs ? (
                  <Link
                    href={it.href ?? "#"}
                    className={cn(
                      "rounded-[var(--radius-btn)] px-3 py-1.5 text-[13px] font-medium",
                      it.danger
                        ? "bg-[var(--rust)] text-[var(--paper)]"
                        : "bg-[var(--ink)] text-[var(--paper)]",
                    )}
                  >
                    {it.action}
                  </Link>
                ) : (
                  <Link
                    href={it.href ?? "#"}
                    className="num text-[10px] uppercase tracking-[0.14em] text-text hover:text-text-mute"
                  >
                    {it.action} →
                  </Link>
                ))}
            </div>
          </div>
          {it.sealStatus && (
            <SealStamp status={it.sealStatus} date={new Date()} size="md" className="shrink-0" />
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(it.id)}
        className="shrink-0 text-text-faint transition-colors hover:text-text"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function InboxView({ items, isAnalyst }: { items: InboxItem[]; isAnalyst: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [filter, setFilter] = useState<"all" | InboxCategory>("all");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => items.filter((it) => !dismissed.has(it.id) && (filter === "all" || it.category === filter)),
    [items, dismissed, filter],
  );
  const needs = visible.filter((it) => it.zone === "needs");
  const good = visible.filter((it) => it.zone === "good");

  function dismiss(id: string) {
    setDismissed((s) => new Set(s).add(id));
    const real = items.find((it) => it.id === id && !it.demo);
    if (real) start(async () => { await markNotificationRead(id); });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Inbox</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPrefsOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm hover:border-border-strong"
          >
            <SlidersHorizontal size={14} /> Preferences
          </button>
          <button
            type="button"
            onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}
            className="num rounded-full border border-border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-text-mute hover:border-border-strong"
          >
            Mark all read
          </button>
        </div>
      </div>

      {prefsOpen && (
        <div className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <PrefGroup title="Reading" rows={READING_PREFS} />
          {isAnalyst && <PrefGroup title="Your research" rows={RESEARCH_PREFS} />}
          <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
            Preferences are not saved yet — storage is pending backend support.
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={cn(
              "num shrink-0 rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
              filter === c.key
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-border text-text-mute hover:border-border-strong",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Needs you</h2>
          <span className="num text-[11px] text-text-mute">{needs.length}</span>
        </div>
        {needs.length === 0 ? (
          <p className="t-meta">Nothing needs your attention right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {needs.map((it) => (
              <Row key={it.id} it={it} onDismiss={dismiss} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Good to know</h2>
          <span className="num text-[11px] text-text-mute">{good.length}</span>
        </div>
        {good.length === 0 ? (
          <p className="t-meta">Nothing here.</p>
        ) : (
          <div className="flex flex-col">
            {good.map((it) => (
              <Row key={it.id} it={it} onDismiss={dismiss} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
