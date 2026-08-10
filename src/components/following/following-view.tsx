"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cn } from "@/lib/design/cn";
import { toggleFollow } from "@/app/actions/social";
import { ScoreRing } from "@/components/ui/score-ring";

export interface FollowCreator {
  id: string;
  href: string;
  name: string;
  initials: string;
  score: number | null;
  specialty: string;
  pubs: string;
}

type Tab = "creators" | "tickers" | "etfs" | "sectors";

/** Follow control with the grey-out-on-unfollow behaviour (row stays, greys). */
function FollowControl({ id, onUnfollow }: { id: string; onUnfollow: () => void }) {
  const [, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        onUnfollow();
        start(async () => {
          await toggleFollow(id);
        });
      }}
      className="group/btn shrink-0 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-[var(--ink)]"
    >
      <span className="group-hover/btn:hidden">Following</span>
      <span className="hidden group-hover/btn:inline">Unfollow</span>
    </button>
  );
}

function CreatorRow({ c }: { c: FollowCreator }) {
  const [unfollowed, setUnfollowed] = useState(false);
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-b border-border py-5 transition-opacity",
        unfollowed && "opacity-50",
      )}
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--ink)] font-display text-sm text-[var(--paper)]">
        {c.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <Link href={c.href} className="font-display text-lg font-semibold tracking-tight hover:underline">
            {c.name}
          </Link>
          <ScoreRing score={c.score} size="sm" />
        </div>
        <div className="num mt-1 text-[10px] uppercase tracking-[0.13em] text-text-mute">{c.specialty}</div>
        <div className="num mt-1 text-[10px] uppercase tracking-[0.13em] text-text-faint">{c.pubs}</div>
      </div>
      {unfollowed ? (
        <span className="num shrink-0 text-[10px] uppercase tracking-[0.16em] text-text-faint">Unfollowed</span>
      ) : (
        <FollowControl id={c.id} onUnfollow={() => setUnfollowed(true)} />
      )}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border">
      <p className="t-meta text-center">
        Following {label} is coming soon.
        <br />
        {label === "tickers" || label === "etfs"
          ? "Instrument follows aren't wired to the backend yet."
          : "Sector follows aren't wired to the backend yet."}
      </p>
    </div>
  );
}

export function FollowingView({ creators }: { creators: FollowCreator[] }) {
  const [tab, setTab] = useState<Tab>("creators");
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "creators", label: "CREATORS", count: creators.length },
    { key: "tickers", label: "TICKERS", count: 0 },
    { key: "etfs", label: "ETFS", count: 0 },
    { key: "sectors", label: "SECTORS", count: 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Following</h1>
        <p className="t-body mt-2">Creators, tickers, ETFs, and sectors you track.</p>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-8 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "num relative whitespace-nowrap pb-3 text-[11px] uppercase tracking-[0.18em] transition-colors",
                  active ? "text-text" : "text-text-mute hover:text-text",
                )}
              >
                {t.label} · {t.count}
                {active && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--ink)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "creators" &&
        (creators.length === 0 ? (
          <p className="t-meta">You are not following anyone yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
            {creators.map((c) => (
              <CreatorRow key={c.id} c={c} />
            ))}
          </div>
        ))}
      {tab === "tickers" && <Placeholder label="tickers" />}
      {tab === "etfs" && <Placeholder label="etfs" />}
      {tab === "sectors" && <Placeholder label="sectors" />}
    </div>
  );
}
