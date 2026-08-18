"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * A band that scrolls horizontally on its own: serif section header, a mono
 * note beside it, a hairline rule, and previous/next arrows at the right of
 * the header that disable when there is nothing further that way. The reader
 * moves through the section without moving the page. Shared by Today, Markets
 * and any surface that lays items out as a rail.
 */
export function Rail({
  title,
  note,
  aside,
  children,
  className,
  trackClassName,
  id,
}: {
  title: string;
  note?: string;
  /** Extra header content (a link, a badge) placed before the arrows. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Classes for the scrolling track (layout of the items inside). */
  trackClassName?: string;
  id?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const step = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <section id={id} className={cn("rail", className)} aria-label={title}>
      <div className="rail-head">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="rail-title">{title}</h2>
          {note ? <p className="rail-note">{note}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {aside}
          <div className="flex items-center gap-1" role="group" aria-label={`Scroll ${title}`}>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={!canPrev}
              aria-label="Previous"
              className="rail-arrow focus-ring"
            >
              <ChevronLeft size={16} strokeWidth={1.6} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={!canNext}
              aria-label="Next"
              className="rail-arrow focus-ring"
            >
              <ChevronRight size={16} strokeWidth={1.6} aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div ref={trackRef} className={cn("rail-track scroll-area", trackClassName)}>
        {children}
      </div>
    </section>
  );
}
