"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { createPollAction } from "@/app/actions/polls";
import type { PollKind } from "@/lib/db/polls";

/**
 * Create-poll form (H3). Kind presets seed sensible options (sentiment =
 * Bull/Bear/Hold; target = price buckets around a level the creator types).
 * Optional close date and plan-rank gate (a plan perk).
 */

const KINDS: { key: PollKind; label: string; hint: string }[] = [
  { key: "sentiment", label: "Sentiment", hint: "Bull / bear / hold on a ticker" },
  { key: "choice", label: "Choice", hint: "Any multi-option question" },
  { key: "coverage", label: "Coverage", hint: "What should I cover next?" },
  { key: "target", label: "Target", hint: "Bucketed price-target guess" },
];

const inputClass =
  "h-10 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm focus-ring";

function defaultOptions(kind: PollKind): string[] {
  if (kind === "sentiment") return ["Bull", "Bear", "Hold"];
  return ["", ""];
}

export function CreatePollForm() {
  const router = useRouter();
  const [kind, setKind] = useState<PollKind>("sentiment");
  const [question, setQuestion] = useState("");
  const [ticker, setTicker] = useState("");
  const [options, setOptions] = useState<string[]>(defaultOptions("sentiment"));
  const [closesAt, setClosesAt] = useState("");
  const [minRank, setMinRank] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pickKind(k: PollKind) {
    setKind(k);
    setOptions(defaultOptions(k));
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createPollAction({
        question,
        kind,
        options,
        ticker: ticker || null,
        minPlanRank: Math.max(0, Number(minRank) || 0),
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setQuestion("");
      setTicker("");
      setOptions(defaultOptions(kind));
      setClosesAt("");
      router.refresh();
    });
  }

  return (
    <div className="surface flex flex-col gap-4 p-5">
      <div>
        <h2 className="t-h3">New poll</h2>
        <p className="t-meta mt-1">
          Ask your audience. Results are community sentiment, never part of your track record.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => pickKind(k.key)}
            title={k.hint}
            className={cn(
              "rounded-[var(--radius-btn)] border px-3 py-1.5 text-sm transition-colors focus-ring",
              kind === k.key
                ? "border-accent bg-accent-weak text-text"
                : "border-border bg-bg text-text-mute hover:border-border-strong",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={
          kind === "coverage" ? "What should I cover next?" : "Where does NVDA end the quarter?"
        }
        className={inputClass}
      />

      <div className="flex flex-wrap gap-2">
        {(kind === "sentiment" || kind === "target") && (
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker"
            className={cn(inputClass, "num w-28")}
          />
        )}
        <input
          type="date"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className={cn(inputClass, "num w-40")}
          aria-label="Closes on"
        />
        <label className="flex items-center gap-2 text-[11px] text-text-mute">
          Min tier rank
          <input
            type="number"
            min={0}
            value={minRank}
            onChange={(e) => setMinRank(e.target.value)}
            className={cn(inputClass, "num h-10 w-16 text-right")}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((o, x) => (x === i ? e.target.value : o)))
              }
              placeholder={`Option ${i + 1}`}
              className={inputClass}
            />
            {options.length > 2 && (
              <button
                type="button"
                aria-label="Remove option"
                onClick={() => setOptions((prev) => prev.filter((_, x) => x !== i))}
                className="text-text-faint hover:text-[var(--down)] focus-ring"
              >
                <X size={15} />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="flex items-center gap-1.5 self-start text-[12px] text-text-mute hover:text-text focus-ring"
          >
            <Plus size={13} /> Add option
          </button>
        )}
      </div>

      {error && <p className="text-sm text-[var(--down)]">{error}</p>}

      <Button type="button" onClick={submit} disabled={pending} className="self-start">
        {pending ? "Creating..." : "Create poll"}
      </Button>
    </div>
  );
}
