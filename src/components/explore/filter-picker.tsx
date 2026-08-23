"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * External browser state, subscribed to rather than measured in an effect.
 *
 * An effect that measures and then sets state has to defer the first read to
 * avoid a synchronous render loop, and anything deferred to a frame simply
 * never happens where frames are not being produced: the sheet stayed a
 * desktop popover. Subscribing gives the right answer on the first render and
 * needs no frame at all.
 */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", notify);
      return () => m.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * The space the on-screen keyboard has actually left, as a `top:height` string.
 *
 * A string rather than an object because `getSnapshot` is called on every
 * render and must not return a fresh reference each time, or React re-renders
 * forever.
 */
function useVisualViewport(): string {
  return useSyncExternalStore(
    (notify) => {
      const vv = window.visualViewport;
      if (!vv) return () => {};
      vv.addEventListener("resize", notify);
      vv.addEventListener("scroll", notify);
      return () => {
        vv.removeEventListener("resize", notify);
        vv.removeEventListener("scroll", notify);
      };
    },
    () => {
      const vv = window.visualViewport;
      return vv ? `${Math.round(vv.offsetTop)}:${Math.round(vv.height)}` : "";
    },
    () => "",
  );
}

/**
 * A filter you type into rather than scroll.
 *
 * The ticker list is the case that matters: a plain menu is fine at a dozen
 * names and unusable at several hundred, and Explore's ticker list grows with
 * the catalogue. Sector is short enough to browse, but uses the same control so
 * the two behave alike.
 *
 * Options carry no counts. A number beside every row is noise on a page whose
 * whole manner is quiet: the reader is choosing a ticker, not auditing
 * coverage. Ordering carries that information instead, most-covered first, so
 * the useful options are the ones in view before anything is typed.
 *
 * The panel is a popover on a wide screen and a sheet on a phone, and the sheet
 * is where this pattern usually breaks: an absolutely positioned list anchored
 * under the trigger ends up behind the on-screen keyboard, so the reader types
 * and cannot see what they are choosing from. The sheet is sized from
 * `visualViewport` instead, which is the only thing that reports the space the
 * keyboard has actually left, with the field pinned at the top and the results
 * scrolling in what remains.
 */
export function FilterPicker({
  label,
  value,
  options,
  onChange,
  searchLabel,
}: {
  /** Shown on the trigger when nothing is selected. */
  label: string;
  value: string | null;
  /** Ordered by coverage, most-covered first. Names only. */
  options: string[];
  onChange: (v: string | null) => void;
  /** Placeholder for the field, e.g. "Search tickers". */
  searchLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const sheet = useMediaQuery("(max-width: 639px)");
  const vv = useVisualViewport();
  const viewport = useMemo(() => {
    if (!sheet || !vv) return null;
    const [top, height] = vv.split(":").map(Number);
    return Number.isFinite(top) && Number.isFinite(height) ? { top, height } : null;
  }, [sheet, vv]);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return options;
    // Names that begin with the query first, then names that merely contain it,
    // so typing "SN" reaches SNOW before it reaches anything ending in "sn".
    const starts: string[] = [];
    const contains: string[] = [];
    for (const o of options) {
      const u = o.toUpperCase();
      if (u.startsWith(q)) starts.push(o);
      else if (u.includes(q)) contains.push(o);
    }
    return [...starts, ...contains];
  }, [options, query]);

  /** Index 0 is always "All", so the options sit at 1..n. */
  const rows = useMemo(() => [null, ...matches], [matches]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const choose = useCallback(
    (v: string | null) => {
      onChange(v);
      close();
    },
    [onChange, close],
  );

  // Focus the field on open, so the control is ready to be typed into.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on a click outside. The sheet covers the screen, so this is really
  // the popover's concern, but it costs nothing to apply to both.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(rows.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (rows.length > 0) choose(rows[Math.min(active, rows.length - 1)]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  const panel = (
    <>
      <div className="border-b border-border p-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={searchLabel}
          aria-label={searchLabel}
          autoComplete="off"
          spellCheck={false}
          className="num w-full bg-transparent px-1.5 py-1 text-[11px] uppercase tracking-[0.14em] text-text outline-none placeholder:text-text-faint"
        />
      </div>
      <ul
        ref={listRef}
        role="listbox"
        aria-label={label}
        className={cn(
          "scroll-area overflow-y-auto py-1",
          sheet ? "min-h-0 flex-1" : "max-h-[280px]",
        )}
      >
        {rows.map((opt, i) => (
          <li key={opt ?? "__all"}>
            <button
              type="button"
              role="option"
              aria-selected={value === opt}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(opt)}
              className={cn(
                "num flex w-full items-center px-3 text-left text-[11px] uppercase tracking-[0.14em]",
                sheet ? "py-3" : "py-2",
                i === active && "bg-surface-2",
                value === opt ? "text-text" : "text-text-mute",
              )}
            >
              {opt ?? "All"}
            </button>
          </li>
        ))}
        {matches.length === 0 ? (
          <li className="num px-3 py-3 text-[11px] uppercase tracking-[0.14em] text-text-faint">
            Nothing matches
          </li>
        ) : null}
      </ul>
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="num focus-ring flex items-center gap-1.5 rounded text-[11px] uppercase tracking-[0.16em] text-text-mute hover:text-text"
      >
        {value ?? label}
        <ChevronDown size={12} strokeWidth={1.6} aria-hidden />
      </button>

      {open ? (
        sheet ? (
          <div
            className="fixed inset-x-0 z-50 flex flex-col border-b border-border bg-surface"
            style={
              viewport
                ? { top: viewport.top, height: viewport.height }
                : { top: 0, height: "100dvh" }
            }
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="num text-[11px] uppercase tracking-[0.16em] text-text-mute">{label}</span>
              <button
                type="button"
                onClick={close}
                className="num focus-ring rounded px-1 text-[11px] uppercase tracking-[0.16em] text-text-mute hover:text-text"
              >
                Close
              </button>
            </div>
            {panel}
          </div>
        ) : (
          <div className="menu-pop absolute right-0 z-20 mt-2 w-[240px] overflow-hidden rounded-[var(--radius-btn)] border border-border bg-surface">
            {panel}
          </div>
        )
      ) : null}
    </div>
  );
}
