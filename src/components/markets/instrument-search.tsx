"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface TickerHit {
  symbol: string;
  company_name: string;
  sector: string | null;
}

/**
 * The product's authoritative instrument search. Deliberately scoped to
 * instruments only: analysts and reports belong to the global nav search, and
 * Markets is the surface that owns tickers, ETFs, and sectors.
 */
export function InstrumentSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ q: string; hits: TickerHit[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim();

  useEffect(() => {
    if (q.length < 1) return;
    let live = true;
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => (r.ok ? r.json() : { tickers: [] }))
        .then((data: { tickers?: TickerHit[] }) => {
          if (!live) return;
          setResult({ q, hits: data.tickers ?? [] });
          setActive(0);
        })
        .catch(() => {
          if (live) setResult({ q, hits: [] });
        });
    }, 160);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  // Results carry the query they answered, so an empty or changed box shows
  // nothing during render rather than being cleared from the effect.
  const hits = q.length >= 1 && result?.q === q ? result.hits : [];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(symbol: string) {
    setOpen(false);
    setQuery("");
    router.push(`/markets/${symbol}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return setOpen(false);
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active].symbol);
    }
  }

  return (
    <div ref={boxRef} className="markets-search">
      <label className="markets-search-field focus-within:border-ink">
        <Search size={18} className="shrink-0 text-text-faint" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search tickers, ETFs, or sectors"
          aria-label="Search tickers, ETFs, or sectors"
          className="w-full bg-transparent text-base outline-none placeholder:text-text-faint"
        />
      </label>
      <p className="markets-search-hint">Instruments · ETFs · Sectors · Themes</p>

      {open && query.trim() && (
        <div className="markets-search-results scroll-area" role="listbox">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-mute">No instruments match that.</p>
          ) : (
            hits.map((hit, i) => (
              <button
                key={hit.symbol}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit.symbol)}
                className={`markets-search-hit ${i === active ? "is-active" : ""}`}
              >
                <span className="num w-16 shrink-0 font-semibold">{hit.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-left">{hit.company_name}</span>
                {hit.sector ? (
                  <span className="num shrink-0 text-[0.625rem] uppercase tracking-[0.12em] text-text-faint">
                    {hit.sector}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
