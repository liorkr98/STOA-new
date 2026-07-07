"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/design/cn";

export interface DiscoverFilters {
  type?: "research" | "call" | "short_post";
  access?: "free" | "paid" | "subscribers";
  moat?: "40" | "70";
  ticker?: string;
}

const TYPE_OPTIONS = [
  { value: "", label: "All" },
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

const MOAT_OPTIONS = [
  { value: "", label: "Any MOAT" },
  { value: "40", label: "MOAT 40+" },
  { value: "70", label: "MOAT 70+" },
] as const;

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 rounded-[var(--radius-btn)] border px-3 text-xs font-medium transition-colors focus-ring",
        active
          ? "border-transparent bg-[var(--ink)] text-[var(--paper)]"
          : "border-border bg-surface text-text-mute hover:border-border-strong hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Discover filters, URL-param driven so results stay server-rendered and
 * shareable. Each group is a pill row; ticker is a small mono input that
 * commits on Enter or blur. Preserves the active tab param.
 */
export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [tickerDraft, setTickerDraft] = useState(params.get("ticker") ?? "");

  useEffect(() => {
    setTickerDraft(params.get("ticker") ?? "");
  }, [params]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/discover?${next.toString()}`, { scroll: false });
  }

  function commitTicker() {
    setParam("ticker", tickerDraft.trim().toUpperCase());
  }

  const hasFilters = ["type", "access", "moat", "ticker"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TYPE_OPTIONS.map((o) => (
        <Pill
          key={o.value || "all-type"}
          active={(params.get("type") ?? "") === o.value}
          onClick={() => setParam("type", o.value)}
        >
          {o.label}
        </Pill>
      ))}

      <span aria-hidden className="h-5 w-px bg-border" />

      {ACCESS_OPTIONS.filter((o) => o.value).map((o) => (
        <Pill
          key={o.value}
          active={params.get("access") === o.value}
          onClick={() => setParam("access", params.get("access") === o.value ? "" : o.value)}
        >
          {o.label}
        </Pill>
      ))}

      <span aria-hidden className="h-5 w-px bg-border" />

      {MOAT_OPTIONS.filter((o) => o.value).map((o) => (
        <Pill
          key={o.value}
          active={params.get("moat") === o.value}
          onClick={() => setParam("moat", params.get("moat") === o.value ? "" : o.value)}
        >
          {o.label}
        </Pill>
      ))}

      <input
        value={tickerDraft}
        onChange={(e) => setTickerDraft(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && commitTicker()}
        onBlur={commitTicker}
        placeholder="Ticker"
        aria-label="Filter by ticker"
        className="num h-8 w-24 rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 text-xs focus-ring placeholder:text-text-faint"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            const tab = params.get("tab");
            router.replace(tab ? `/discover?tab=${tab}` : "/discover", { scroll: false });
          }}
          className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-btn)] px-2 text-xs text-text-faint transition-colors hover:text-text focus-ring"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}
