"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export interface SubscriberRowVM {
  id: string;
  name: string;
  initials: string;
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
            className="w-full bg-transparent text-body outline-none placeholder:text-text-faint"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="t-meta">No subscribers match.</p>
      ) : (
        <div>
          <div className="num hidden grid-cols-[1fr_120px_180px] gap-4 border-b border-border py-3 text-ticker text-text-faint md:grid">
            <div>Subscriber</div>
            <div>Joined</div>
            <div>Status</div>
          </div>
          {shown.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 border-b border-border py-3 md:grid md:grid-cols-[1fr_120px_180px] md:items-center md:gap-4"
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={r.name} size="sm" />
                <span className="text-body">{r.name}</span>
              </div>
              <div className="num text-ticker text-text-mute">{r.joined}</div>
              <div
                className="num text-ticker"
                style={{ color: r.statusTone === "active" ? "var(--text)" : "var(--text-mute)" }}
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
