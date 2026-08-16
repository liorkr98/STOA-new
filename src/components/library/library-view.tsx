"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Lock, Search } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { toggleSave } from "@/app/actions/social";
import { TickerChip, ThemeTag } from "@/components/ui/ticker-chip";
import { ScoreRing } from "@/components/ui/score-ring";

export interface LibraryItem {
  id: string;
  href: string;
  typeLabel: string;
  tag: string | null;
  tagIsTicker: boolean;
  badge: string;
  title: string;
  deck: string | null;
  analystName: string;
  analystInitials: string;
  analystHref: string;
  analystScore: number | null;
  state: string;
  chipTone: "ink" | "outline";
  locked: boolean;
  sub: string | null;
  subHref: string | null;
  owned: boolean;
  saved: boolean;
  free: boolean;
}

type Filter = "all" | "owned" | "saved" | "free";
const CHIPS: { key: Filter; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "owned", label: "OWNED" },
  { key: "saved", label: "SAVED" },
  { key: "free", label: "FREE" },
];

function Bmk({ id, saved }: { id: string; saved: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={on ? "Unsave" : "Save"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn((v) => !v);
        start(async () => {
          await toggleSave(id);
          router.refresh();
        });
      }}
      className="shrink-0 text-text transition-opacity hover:opacity-60"
    >
      <Bookmark size={16} strokeWidth={1.4} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

export function LibraryView({ items }: { items: LibraryItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const passFilter =
        filter === "all" ||
        (filter === "owned" && it.owned) ||
        (filter === "saved" && it.saved) ||
        (filter === "free" && it.free);
      const passQuery =
        !q ||
        it.title.toLowerCase().includes(q) ||
        it.analystName.toLowerCase().includes(q) ||
        (it.tag ?? "").toLowerCase().includes(q);
      return passFilter && passQuery;
    });
  }, [items, filter, query]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Library</h1>
        <p className="t-body mt-2">Everything you saved and everything you own.</p>
        <p className="num mt-2.5 text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Saved reports stay locked until you unlock them — access is checked when you open.
        </p>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <div className="sm:ml-auto flex items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2 sm:w-64">
          <Search size={14} className="text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="t-meta">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-3 md:gap-0">
          {shown.map((it) => (
            <div
              key={it.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5 md:grid md:grid-cols-[1fr_260px] md:items-center md:gap-8 md:rounded-none md:border-0 md:border-b md:bg-transparent md:p-0 md:py-6"
            >
              <Link href={it.href} className="block">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">{it.typeLabel}</span>
                  {it.tag &&
                    (it.tagIsTicker ? <TickerChip ticker={it.tag} /> : <ThemeTag label={it.tag} />)}
                  <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{it.badge}</span>
                </div>
                <h3 className="mt-3 max-w-[700px] font-display text-xl font-semibold leading-snug tracking-tight md:text-[23px]">
                  {it.title}
                </h3>
                {it.deck && <p className="mt-1.5 max-w-[680px] text-[14.5px] text-text-mute">{it.deck}</p>}
                <div className="mt-3.5 flex items-center gap-2.5">
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--ink)] text-[10px] text-[var(--paper)]">
                    {it.analystInitials}
                  </span>
                  <span className="text-sm">{it.analystName}</span>
                  <ScoreRing score={it.analystScore} size="sm" />
                </div>
              </Link>

              <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:flex-col md:items-end md:gap-2">
                <div className="flex items-center gap-2.5 md:order-2 md:self-end">
                  <Bmk id={it.id} saved={it.saved} />
                  <span
                    className={cn(
                      "num flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em]",
                      it.chipTone === "ink"
                        ? "bg-[var(--ink)] text-[var(--paper)]"
                        : "border border-border text-text-mute",
                    )}
                  >
                    {it.locked && <Lock size={10} strokeWidth={1.4} aria-hidden />}
                    {it.state}
                  </span>
                </div>
                {it.sub &&
                  (it.subHref ? (
                    <Link
                      href={it.subHref}
                      className="num text-[10px] uppercase tracking-[0.14em] text-text transition-colors hover:text-text-mute md:order-1 md:text-right"
                    >
                      {it.sub}
                    </Link>
                  ) : (
                    <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint md:order-1 md:text-right">
                      {it.sub}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
