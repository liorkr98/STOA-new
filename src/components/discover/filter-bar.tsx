"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/design/cn";

export interface DiscoverFilters {
  type?: "research" | "call" | "short_post";
  access?: "free" | "paid" | "subscribers";
  score?: string;
  ticker?: string;
  status?: "open" | "resolved";
  mcap?: "mega" | "large" | "mid" | "small";
}

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "research", label: "Research" },
  { value: "call", label: "Calls" },
  { value: "short_post", label: "Posts" },
] as const;

const ACCESS_OPTIONS = [
  { value: "", label: "Any access" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "subscribers", label: "Subscribers" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "open", label: "Unresolved" },
  { value: "resolved", label: "Resolved" },
] as const;

const SCORE_OPTIONS = [
  { value: "", label: "Any Track Score" },
  { value: "40", label: "40+" },
  { value: "60", label: "60+" },
  { value: "70", label: "70+" },
  { value: "80", label: "80+" },
] as const;

const MCAP_OPTIONS = [
  { value: "", label: "Any market cap" },
  { value: "mega", label: "Mega ($200B+)" },
  { value: "large", label: "Large ($10B to $200B)" },
  { value: "mid", label: "Mid ($2B to $10B)" },
  { value: "small", label: "Small (under $2B)" },
] as const;

const FILTER_KEYS = ["type", "access", "score", "moat", "ticker", "status", "mcap"] as const;

const selectClass =
  "h-9 min-w-[8.5rem] rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 text-xs text-text focus-ring";

/**
 * Discover filters as a compact toolbar of selects + ticker field.
 * URL-param driven so results stay shareable and server-rendered.
 */
export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [tickerDraft, setTickerDraft] = useState(params.get("ticker") ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTickerDraft(params.get("ticker") ?? "");
  }, [params]);

  function replaceParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startTransition(() => {
      router.replace(`/discover?${next.toString()}`, { scroll: false });
    });
  }

  function setParam(key: string, value: string) {
    replaceParams((next) => {
      if (key === "score") next.delete("moat");
      if (value) next.set(key, value);
      else next.delete(key);
    });
  }

  function commitTicker() {
    setParam("ticker", tickerDraft.trim().toUpperCase());
  }

  const scoreValue = params.get("score") ?? params.get("moat") ?? "";
  const activeCount = FILTER_KEYS.filter((k) => {
    if (k === "moat") return false;
    if (k === "score") return Boolean(scoreValue);
    return Boolean(params.get(k));
  }).length;

  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[var(--radius-btn)] border px-3 text-xs font-medium transition-colors focus-ring",
            open || activeCount > 0
              ? "border-border-strong bg-surface-2 text-text"
              : "border-border text-text-mute hover:text-text",
          )}
        >
          <SlidersHorizontal size={14} aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="num rounded-[var(--r-tag)] bg-[var(--ink)] px-1.5 py-px text-[10px] font-semibold text-[var(--paper)]">
              {activeCount}
            </span>
          )}
        </button>

        <input
          value={tickerDraft}
          onChange={(e) => setTickerDraft(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && commitTicker()}
          onBlur={commitTicker}
          placeholder="Ticker"
          aria-label="Filter by ticker"
          className="num h-9 w-28 rounded-[var(--radius-btn)] border border-border bg-paper px-2.5 text-xs focus-ring placeholder:text-text-faint"
        />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              const tab = params.get("tab");
              startTransition(() => {
                router.replace(tab ? `/discover?tab=${tab}` : "/discover", { scroll: false });
              });
              setTickerDraft("");
            }}
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-btn)] px-2 text-xs text-text-faint transition-colors hover:text-text focus-ring"
          >
            <X size={12} aria-hidden />
            Clear
          </button>
        )}

        {pending && <span className="t-meta ml-auto text-[11px]">Updating…</span>}
      </div>

      {open && (
        <div className="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1.5">
            <span className="t-meta text-[10px] uppercase tracking-wider">Type</span>
            <select
              className={selectClass}
              value={params.get("type") ?? ""}
              onChange={(e) => setParam("type", e.target.value)}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value || "all-type"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-meta text-[10px] uppercase tracking-wider">Access</span>
            <select
              className={selectClass}
              value={params.get("access") ?? ""}
              onChange={(e) => setParam("access", e.target.value)}
            >
              {ACCESS_OPTIONS.map((o) => (
                <option key={o.value || "any-access"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-meta text-[10px] uppercase tracking-wider">Call status</span>
            <select
              className={selectClass}
              value={params.get("status") ?? ""}
              onChange={(e) => setParam("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "any-status"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-meta text-[10px] uppercase tracking-wider">Track Score</span>
            <select
              className={selectClass}
              value={scoreValue}
              onChange={(e) => setParam("score", e.target.value)}
            >
              {SCORE_OPTIONS.map((o) => (
                <option key={o.value || "any-score"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-meta text-[10px] uppercase tracking-wider">Market cap</span>
            <select
              className={selectClass}
              value={params.get("mcap") ?? ""}
              onChange={(e) => setParam("mcap", e.target.value)}
            >
              {MCAP_OPTIONS.map((o) => (
                <option key={o.value || "any-mcap"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
