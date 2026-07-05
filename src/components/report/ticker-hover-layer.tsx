"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkline } from "@/components/charts/sparkline";

/**
 * TickerHoverLayer (H1): delegated hover for every tickerMark ($NVDA) inside a
 * container. One floating card app-wide: last price, day change (up/down
 * colored), 30d sparkline, and a link to the company page. Fetches through the
 * existing quote/sparkline proxies, cached per ticker for the session.
 */

interface CardData {
  price: number | null;
  change: number | null;
  points: number[];
}

const cache = new Map<string, CardData>();

async function load(ticker: string): Promise<CardData> {
  const hit = cache.get(ticker);
  if (hit) return hit;
  const [quoteRes, sparkRes] = await Promise.all([
    fetch(`/api/market/quote?ticker=${ticker}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`/api/market/sparkline?ticker=${ticker}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const points: number[] = sparkRes?.points ?? [];
  const price: number | null = typeof quoteRes?.price === "number" ? quoteRes.price : null;
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const change = price != null && prev ? ((price - prev) / prev) * 100 : null;
  const data = { price, change, points };
  cache.set(ticker, data);
  return data;
}

export function TickerHoverLayer({ containerRef }: { containerRef?: React.RefObject<HTMLElement | null> }) {
  const [card, setCard] = useState<{ ticker: string; x: number; y: number } | null>(null);
  const [data, setData] = useState<CardData | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const root: HTMLElement | Document = containerRef?.current ?? document;

    function onOver(e: Event) {
      const target = (e.target as HTMLElement).closest?.("[data-ticker-mark]");
      if (!target) return;
      const ticker = target.getAttribute("data-ticker-mark");
      if (!ticker) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const rect = (target as HTMLElement).getBoundingClientRect();
      setCard({ ticker, x: rect.left, y: rect.bottom + 6 });
      setData(null);
      void load(ticker).then((d) => setData(d));
    }

    function onOut(e: Event) {
      const target = (e.target as HTMLElement).closest?.("[data-ticker-mark]");
      if (!target) return;
      hideTimer.current = setTimeout(() => setCard(null), 250);
    }

    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [containerRef]);

  if (!card) return null;

  return (
    <div
      role="tooltip"
      className="menu-pop fixed z-50 w-56 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
      style={{ left: Math.min(card.x, typeof window !== "undefined" ? window.innerWidth - 240 : card.x), top: card.y }}
      onMouseEnter={() => hideTimer.current && clearTimeout(hideTimer.current)}
      onMouseLeave={() => setCard(null)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="num text-sm font-semibold">{card.ticker}</span>
        {data?.price != null ? (
          <span className="num text-sm">${data.price.toFixed(2)}</span>
        ) : (
          <span className="t-meta text-[11px]">{data ? "no data" : "loading..."}</span>
        )}
      </div>
      {data?.change != null && (
        <span
          className="num text-[11px]"
          style={{ color: data.change >= 0 ? "var(--up)" : "var(--down)" }}
        >
          {data.change >= 0 ? "+" : ""}
          {data.change.toFixed(2)}% today
        </span>
      )}
      {data && data.points.length > 1 && (
        <div className="mt-2">
          <Sparkline data={data.points} width={200} height={36} />
        </div>
      )}
      <Link
        href={`/markets/${card.ticker}`}
        className="t-meta mt-2 block text-[11px] underline hover:text-text"
      >
        Open {card.ticker} coverage
      </Link>
    </div>
  );
}
