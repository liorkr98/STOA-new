"use client";

import { useMemo, useState, useTransition } from "react";
import { BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { seriesColor } from "@/lib/design/chart-theme";
import { votePollAction } from "@/app/actions/polls";
import type { Poll } from "@/lib/db/polls";

/**
 * PollCard (H3). A surface card -- NEVER .ledger-card -- with horizontal result
 * bars on the categorical palette and tabular percentages. One vote per user
 * (changeable until close). Always labelled community sentiment: a poll is not
 * a call and is never scored.
 */

function isClosed(poll: Poll): boolean {
  return !!poll.closes_at && new Date(poll.closes_at) <= new Date();
}

const KIND_LABEL: Record<Poll["kind"], string> = {
  sentiment: "Sentiment",
  choice: "Poll",
  coverage: "Coverage vote",
  target: "Target guess",
};

export function PollCard({ poll, isAuthed }: { poll: Poll; isAuthed: boolean }) {
  const [myOption, setMyOption] = useState(poll.my_option_id);
  const [bump, setBump] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const closed = isClosed(poll);

  const counts = useMemo(() => {
    const map = new Map(poll.options.map((o) => [o.id, o.votes]));
    if (myOption !== poll.my_option_id) {
      if (poll.my_option_id) map.set(poll.my_option_id, (map.get(poll.my_option_id) ?? 1) - 1);
      if (myOption) map.set(myOption, (map.get(myOption) ?? 0) + 1);
    }
    for (const [k, v] of Object.entries(bump)) map.set(k, (map.get(k) ?? 0) + v);
    return map;
  }, [poll, myOption, bump]);

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const showResults = closed || myOption != null;

  function vote(optionId: string) {
    if (!isAuthed || closed || pending || optionId === myOption) return;
    setMyOption(optionId);
    setBump({});
    start(async () => {
      const ok = await votePollAction(poll.id, optionId);
      if (!ok) setMyOption(poll.my_option_id);
    });
  }

  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={14} className="text-text-faint" />
        <span className="t-eyebrow">{KIND_LABEL[poll.kind]}</span>
        {poll.ticker && <span className="num text-[11px] font-semibold">{poll.ticker}</span>}
        {poll.closes_at && (
          <span className="t-meta ml-auto flex items-center gap-1 text-[11px]">
            <Clock size={11} />
            {closed ? "Closed" : `Closes ${new Date(poll.closes_at).toLocaleDateString()}`}
          </span>
        )}
      </div>

      <p className="text-[0.9375rem] font-medium leading-snug">{poll.question}</p>

      <div className="flex flex-col gap-1.5">
        {poll.options.map((option, i) => {
          const votes = counts.get(option.id) ?? 0;
          const pct = total > 0 ? (votes / total) * 100 : 0;
          const mine = option.id === myOption;
          return (
            <button
              key={option.id}
              type="button"
              disabled={closed || !isAuthed || pending}
              onClick={() => vote(option.id)}
              className={cn(
                "focus-ring relative overflow-hidden rounded-[var(--radius-btn)] border px-3 py-2 text-left text-sm transition-colors",
                mine ? "border-accent" : "border-border",
                !closed && isAuthed && "hover:border-border-strong",
                (closed || !isAuthed) && "cursor-default",
              )}
            >
              {showResults && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 opacity-25 transition-[width] duration-[var(--dur-3)] ease-[var(--ease-out)]"
                  style={{ width: `${pct}%`, background: seriesColor(i) }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span>{option.label}</span>
                {showResults && <span className="num text-[11px] text-text-mute">{pct.toFixed(0)}%</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="t-meta text-[11px]">
          {total} {total === 1 ? "vote" : "votes"}
          {!isAuthed && !closed ? " - sign in to vote" : ""}
        </span>
        <span className="t-meta text-[11px]">Community sentiment - not investment advice</span>
      </div>
    </div>
  );
}
