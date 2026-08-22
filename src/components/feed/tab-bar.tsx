"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design/cn";

export function TabBar({
  tabs,
  active,
  param = "tab",
  /** Current URL search string (without `?`) so filter params survive tab switches. */
  query = "",
}: {
  tabs: { key: string; label: string }[];
  active: string;
  param?: string;
  query?: string;
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement | null>(null);
  // Drives render (it decides whether the underline transitions), so it is
  // state rather than a ref: the first placement lands with no animation, and
  // every move after it slides.
  const [animate, setAnimate] = useState(false);
  // The shared underline slides between tabs (MOTION.md A.3). Base width is
  // 1px and the real width comes from scaleX, so only transform animates.
  const [indicator, setIndicator] = useState<{ x: number; scale: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(active)}"]`);
      if (!el) {
        setIndicator(null);
        return;
      }
      const inset = 12;
      setIndicator({ x: el.offsetLeft + inset, scale: Math.max(el.offsetWidth - inset * 2, 1) });
    };

    measure();
    const raf = requestAnimationFrame(() => setAnimate(true));
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, tabs]);

  function hrefFor(key: string) {
    const next = new URLSearchParams(query);
    next.set(param, key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div ref={listRef} className="relative flex items-center gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            data-tab-key={t.key}
            href={hrefFor(t.key)}
            className={cn(
              "focus-ring relative whitespace-nowrap rounded-[var(--radius-btn)] px-3 py-3 text-sm transition-colors",
              isActive ? "text-text" : "text-text-mute hover:text-text",
            )}
          >
            {t.label}
          </Link>
        );
      })}
      {indicator && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 w-px bg-border-strong"
          style={{
            transform: `translateX(${indicator.x}px) scaleX(${indicator.scale})`,
            transformOrigin: "0 50%",
            transition: animate ? "transform var(--dur-2) var(--ease-in-out)" : "none",
          }}
        />
      )}
    </div>
  );
}
