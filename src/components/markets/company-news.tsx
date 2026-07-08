"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import type { NewsItem } from "@/lib/market/types";

type NewsState =
  | { status: "loading"; items: NewsItem[] }
  | { status: "ready"; items: NewsItem[] }
  | { status: "error"; items: NewsItem[] };

function formatRelativeDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffMs = ts - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (mins < 60) return rtf.format(diffMs < 0 ? -mins : mins, "minute");
  if (hours < 48) return rtf.format(diffMs < 0 ? -hours : hours, "hour");
  return rtf.format(diffMs < 0 ? -days : days, "day");
}

export function CompanyNews({ ticker }: { ticker: string }) {
  const [state, setState] = useState<NewsState>({ status: "loading", items: [] });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setState({ status: "loading", items: [] });
      try {
        const res = await fetch(`/api/market/news?ticker=${encodeURIComponent(ticker)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("news_request_failed");
        const payload = (await res.json()) as { items?: NewsItem[] };
        if (!cancelled) {
          setState({ status: "ready", items: payload.items ?? [] });
        }
      } catch {
        if (!cancelled) setState({ status: "error", items: [] });
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ticker]);

  const items = useMemo(() => state.items.slice(0, 8), [state.items]);

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="t-h3">Latest news</h2>
          <p className="t-meta mt-1">Recent company headlines for research context.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-mute">
          <Newspaper size={13} />
          Finnhub
        </span>
      </div>

      {state.status === "loading" && (
        <p className="t-meta rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2">
          Loading news...
        </p>
      )}

      {state.status === "error" && (
        <p className="t-meta rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2">
          News is temporarily unavailable.
        </p>
      )}

      {state.status !== "loading" && state.status !== "error" && items.length === 0 && (
        <p className="t-meta rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2">
          No recent headlines available.
        </p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-[var(--paper)]">
          {items.map((item) => (
            <li key={`${item.url}-${item.datetime}`} className="px-4 py-3">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-[var(--radius-btn)] focus-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-text group-hover:text-accent">{item.headline}</p>
                  <ExternalLink size={14} className="mt-0.5 shrink-0 text-text-faint group-hover:text-text-mute" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-faint">
                  <span>{item.source ?? "Unknown source"}</span>
                  <span aria-hidden>·</span>
                  <span className="num">{formatRelativeDate(item.datetime)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
