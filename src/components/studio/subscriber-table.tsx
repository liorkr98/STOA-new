"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export interface SubscriberRowVM {
  id: string;
  name: string;
  initials: string;
  tier: string;
  joined: string;
  statusLabel: string;
  statusTone: "active" | "muted";
}

export function SubscriberTable({ rows }: { rows: SubscriberRowVM[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.name.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2 sm:w-64">
          <Search size={14} className="text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subscribers"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </div>
        <button
          type="button"
          disabled
          className="num sm:ml-auto text-[10.5px] uppercase tracking-[0.16em] text-text-faint"
        >
          Export CSV
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="t-meta">No subscribers match.</p>
      ) : (
        <div>
          <div className="num hidden grid-cols-[1fr_120px_120px_180px] gap-4 border-b border-border py-3 text-[9.5px] uppercase tracking-[0.16em] text-text-faint md:grid">
            <div>Subscriber</div>
            <div>Tier</div>
            <div>Joined</div>
            <div>Status</div>
          </div>
          {shown.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 border-b border-border py-3 md:grid md:grid-cols-[1fr_120px_120px_180px] md:items-center md:gap-4"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--ink)] text-[9px] text-[var(--paper)]">
                  {r.initials}
                </span>
                <span className="text-sm">{r.name}</span>
              </div>
              <div className="num text-[12px] text-text-mute">{r.tier}</div>
              <div className="num text-[12px] text-text-mute">{r.joined}</div>
              <div
                className="num text-[10.5px] uppercase tracking-[0.14em]"
                style={{ color: r.statusTone === "active" ? "var(--verdigris)" : "var(--text-mute)" }}
              >
                {r.statusLabel}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
