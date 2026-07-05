"use client";

import { useEffect, useState, useTransition } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { getClaimVotesAction, voteClaimAction } from "@/app/actions/claim-votes";
import type { ClaimVoteState } from "@/lib/db/claim-votes";

/**
 * ClaimVoteBar (H2): bull/bear tap + tally inside a claim popover. Loads
 * lazily when the popover opens; optimistic toggle. Community sentiment only,
 * labelled as such -- a tally never affects the creator's score.
 */

const cache = new Map<string, ClaimVoteState | null>();

export function ClaimVoteBar({
  reportId,
  claimText,
  isAuthed,
}: {
  reportId: string;
  claimText: string;
  isAuthed: boolean;
}) {
  const key = `${reportId}:${claimText}`;
  const [state, setState] = useState<ClaimVoteState | null | undefined>(cache.get(key));
  const [pending, start] = useTransition();

  useEffect(() => {
    if (cache.has(key)) return;
    let live = true;
    void getClaimVotesAction(reportId, claimText).then((s) => {
      cache.set(key, s);
      if (live) setState(s);
    });
    return () => {
      live = false;
    };
  }, [key, reportId, claimText]);

  if (state === undefined) return null;
  if (state === null) return null;

  function tap(stance: "bull" | "bear") {
    if (!isAuthed || pending || !state) return;
    const prev = state;
    const next: ClaimVoteState = { ...prev };
    if (prev.mine === stance) {
      next.mine = null;
      next[stance] = Math.max(0, prev[stance] - 1);
    } else {
      if (prev.mine) next[prev.mine] = Math.max(0, prev[prev.mine] - 1);
      next.mine = stance;
      next[stance] = prev[stance] + 1;
    }
    setState(next);
    cache.set(key, next);
    start(async () => {
      const ok = await voteClaimAction(prev.claimId, stance);
      if (!ok) {
        setState(prev);
        cache.set(key, prev);
      }
    });
  }

  const total = state.bull + state.bear;

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center gap-1.5">
        <StanceButton
          active={state.mine === "bull"}
          disabled={!isAuthed || pending}
          onClick={() => tap("bull")}
          color="var(--up)"
          icon={<TrendingUp size={12} />}
          count={state.bull}
          label="Bull"
        />
        <StanceButton
          active={state.mine === "bear"}
          disabled={!isAuthed || pending}
          onClick={() => tap("bear")}
          color="var(--down)"
          icon={<TrendingDown size={12} />}
          count={state.bear}
          label="Bear"
        />
        {total > 0 && (
          <div className="ml-1 flex h-1.5 flex-1 overflow-hidden rounded-[2px] bg-surface-2">
            <span style={{ width: `${(state.bull / total) * 100}%`, background: "var(--up)", opacity: 0.7 }} />
            <span style={{ width: `${(state.bear / total) * 100}%`, background: "var(--down)", opacity: 0.7 }} />
          </div>
        )}
      </div>
      <p className="t-meta mt-1 text-[10px]">Community sentiment - not investment advice</p>
    </div>
  );
}

function StanceButton({
  active,
  disabled,
  onClick,
  color,
  icon,
  count,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center gap-1 rounded-[var(--radius-tag)] border px-1.5 py-0.5 text-[11px] transition-colors",
        active ? "bg-surface-2" : "hover:bg-surface-2",
        disabled && "cursor-default opacity-70",
      )}
      style={{ color, borderColor: active ? color : "var(--border)" }}
    >
      {icon}
      <span className="num">{count}</span>
    </button>
  );
}
