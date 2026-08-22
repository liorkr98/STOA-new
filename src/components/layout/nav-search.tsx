"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/design/cn";

type CreatorHit = {
  id: string;
  handle: string;
  display_name: string;
  score: number;
};

type TickerHit = {
  symbol: string;
  company_name: string;
  sector: string | null;
};

type ReportHit = {
  id: string;
  title: string;
  ticker: string | null;
  author_handle: string | null;
};

// Stable empties, so an idle search box does not hand the list a new array
// identity on every render.
const EMPTY_CREATORS: CreatorHit[] = [];
const EMPTY_TICKERS: TickerHit[] = [];
const EMPTY_REPORTS: ReportHit[] = [];

/**
 * Nav search. Rests as an icon to keep the right side of the nav light, and
 * expands in place into a field on click (Escape or a click away collapses it).
 */
export function NavSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<{
    q: string;
    creators: CreatorHit[];
    tickers: TickerHit[];
    reports: ReportHit[];
  } | null>(null);

  const trimmed = q.trim();

  useEffect(() => {
    if (trimmed.length < 1) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`, {
        signal: controller.signal,
      })
        .then(async (r) => {
          const data = (await r.json()) as {
            creators?: CreatorHit[];
            tickers?: TickerHit[];
            reports?: ReportHit[];
            error?: string;
          };
          if (!r.ok && !data.creators && !data.tickers) {
            throw new Error(data.error ?? "search failed");
          }
          setResult({
            q: trimmed,
            creators: data.creators ?? [],
            tickers: data.tickers ?? [],
            reports: data.reports ?? [],
          });
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResult({ q: trimmed, creators: [], tickers: [], reports: [] });
          setOpen(true);
        });
    }, 90);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed]);

  // The result carries the query it answered, so clearing the box empties the
  // panel during render instead of through a second effect pass.
  const settled = trimmed.length >= 1 && result?.q === trimmed ? result : null;
  const loading = trimmed.length >= 1 && settled === null;
  const creators = settled?.creators ?? EMPTY_CREATORS;
  const tickers = settled?.tickers ?? EMPTY_TICKERS;
  const reports = settled?.reports ?? EMPTY_REPORTS;

  /** Collapse back to the icon, dropping any in-progress query. */
  const collapse = useCallback(() => {
    setOpen(false);
    setExpanded(false);
    setQ("");
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) collapse();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [collapse]);

  // Focus the field the moment it appears, so it is ready to type into.
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setExpanded(true);
        inputRef.current?.focus();
        if (q.trim().length >= 1) setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [q]);

  const hasHits = creators.length > 0 || tickers.length > 0 || reports.length > 0;
  const showPanel = expanded && open && q.trim().length >= 1;

  if (!expanded) {
    return (
      <button
        type="button"
        aria-label="Search tickers, analysts"
        aria-expanded={false}
        onClick={() => setExpanded(true)}
        className="focus-ring flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-btn)] text-text-mute transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Search size={17} aria-hidden />
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative w-[220px] lg:w-[300px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = q.trim();
          collapse();
          router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
        }}
      >
        <Search
          size={13}
          className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-text-faint"
          aria-hidden
        />
        <input
          ref={inputRef}
          name="q"
          type="text"
          inputMode="search"
          role="combobox"
          dir="ltr"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 1 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              inputRef.current?.blur();
              collapse();
            }
          }}
          placeholder="Search tickers, analysts"
          aria-label="Search tickers, analysts, or reports"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          aria-busy={loading}
          className="h-[34px] w-full appearance-none rounded-[var(--radius-btn)] border border-border bg-surface py-1 pl-8 pr-7 text-left text-xs text-text placeholder:text-text-mute focus-ring"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 rounded-[var(--radius-btn)] p-0.5 text-text-faint hover:text-text focus-ring"
          >
            <X size={12} aria-hidden />
          </button>
        ) : null}
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[16rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-paper shadow-[var(--shadow-card)] sm:w-[18rem]"
        >
          {loading && !hasHits ? (
            <p className="px-3 py-2.5 text-[11px] text-text-faint" role="status">
              Searching…
            </p>
          ) : !loading && !hasHits ? (
            <div className="px-3 py-2.5">
              <p className="text-[11px] text-text-mute">No matches for &ldquo;{q.trim()}&rdquo;</p>
              <button
                type="button"
                onClick={() => {
                  collapse();
                  router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
                className="mt-1.5 text-[11px] font-medium text-text underline hover:no-underline focus-ring rounded-[var(--radius-btn)]"
              >
                Search all
              </button>
            </div>
          ) : (
            <>
              {tickers.length > 0 && (
                <div className="border-b border-border px-1.5 py-1.5">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                    Markets
                  </p>
                  {tickers.map((t) => (
                    <Link
                      key={t.symbol}
                      href={`/markets/${t.symbol}`}
                      role="option"
                      onClick={collapse}
                      className="flex items-center justify-between rounded-[var(--radius-btn)] px-2 py-1 text-xs hover:bg-surface-2 focus-ring"
                    >
                      <span className="num font-semibold">{t.symbol}</span>
                      <span className="truncate pl-2 text-[11px] text-text-mute">{t.company_name}</span>
                    </Link>
                  ))}
                </div>
              )}
              {creators.length > 0 && (
                <div className="border-b border-border px-1.5 py-1.5">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                    Analysts
                  </p>
                  {creators.map((c) => (
                    <Link
                      key={c.id}
                      href={`/analyst/${c.handle}`}
                      role="option"
                      onClick={collapse}
                      className={cn(
                        "flex items-center justify-between rounded-[var(--radius-btn)] px-2 py-1 text-xs hover:bg-surface-2 focus-ring",
                      )}
                    >
                      <span className="truncate font-medium">{c.display_name}</span>
                      <span className="num shrink-0 pl-2 text-[11px] text-text-faint">@{c.handle}</span>
                    </Link>
                  ))}
                </div>
              )}
              {reports.length > 0 && (
                <div className="px-1.5 py-1.5">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                    Reports
                  </p>
                  {reports.map((r) => (
                    <Link
                      key={r.id}
                      href={`/report/${r.id}`}
                      role="option"
                      onClick={collapse}
                      className="block rounded-[var(--radius-btn)] px-2 py-1 text-xs hover:bg-surface-2 focus-ring"
                    >
                      <span className="line-clamp-1 font-medium">{r.title}</span>
                      <span className="num text-[10px] text-text-faint">
                        {r.ticker ?? "—"}
                        {r.author_handle ? ` · @${r.author_handle}` : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  collapse();
                  router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
                className="w-full border-t border-border px-3 py-2 text-left text-[11px] font-medium text-text-mute hover:bg-surface-2 hover:text-text focus-ring"
              >
                View all results
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
