"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
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

/**
 * Compact center-nav search with typeahead into /api/search.
 * Enter still opens the full /search page.
 */
export function NavSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creators, setCreators] = useState<CreatorHit[]>([]);
  const [tickers, setTickers] = useState<TickerHit[]>([]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setCreators([]);
      setTickers([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data: { creators?: CreatorHit[]; tickers?: TickerHit[] }) => {
          setCreators(data.creators ?? []);
          setTickers(data.tickers ?? []);
          setOpen(true);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setCreators([]);
          setTickers([]);
          setLoading(false);
          setOpen(true);
        });
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const hasHits = creators.length > 0 || tickers.length > 0;
  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full max-w-[200px] sm:max-w-[280px] md:max-w-[320px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = q.trim();
          setOpen(false);
          router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
        }}
      >
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          aria-hidden
        />
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search"
          aria-label="Search tickers or analysts"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          aria-busy={loading}
          className="w-full rounded-[var(--radius-btn)] border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-text placeholder:text-text-mute focus-ring"
          autoComplete="off"
        />
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--radius-card)] border border-border bg-paper shadow-[var(--shadow-card)]"
        >
          {loading && !hasHits ? (
            <p className="px-3 py-3 text-xs text-text-faint" role="status">
              Searching…
            </p>
          ) : !loading && !hasHits ? (
            <div className="px-3 py-3">
              <p className="text-xs text-text-mute">No quick matches for &ldquo;{q.trim()}&rdquo;</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
                className="mt-2 text-xs font-medium text-text underline hover:no-underline focus-ring rounded-[var(--radius-btn)]"
              >
                Search all results
              </button>
            </div>
          ) : (
            <>
              {tickers.length > 0 && (
                <div className="border-b border-border px-2 py-2">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                    Markets
                  </p>
                  {tickers.map((t) => (
                    <Link
                      key={t.symbol}
                      href={`/markets/${t.symbol}`}
                      role="option"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-[var(--radius-btn)] px-2 py-1.5 text-sm hover:bg-surface-2 focus-ring"
                    >
                      <span className="num font-semibold">{t.symbol}</span>
                      <span className="truncate pl-3 text-xs text-text-mute">{t.company_name}</span>
                    </Link>
                  ))}
                </div>
              )}
              {creators.length > 0 && (
                <div className="px-2 py-2">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                    Analysts
                  </p>
                  {creators.map((c) => (
                    <Link
                      key={c.id}
                      href={`/analyst/${c.handle}`}
                      role="option"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-[var(--radius-btn)] px-2 py-1.5 text-sm hover:bg-surface-2 focus-ring",
                      )}
                    >
                      <span className="truncate font-medium">{c.display_name}</span>
                      <span className="num shrink-0 pl-3 text-xs text-text-faint">@{c.handle}</span>
                    </Link>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
                className="w-full border-t border-border px-3 py-2 text-left text-xs font-medium text-text-mute hover:bg-surface-2 hover:text-text focus-ring"
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
