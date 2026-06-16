"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { publishReport, saveDraft, type ComposeInput } from "@/app/actions/reports";
import type { AccessType, ContentType, Direction } from "@/lib/types";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring";

const types: { key: ContentType; label: string; hint: string }[] = [
  { key: "research", label: "Research", hint: "Long-form analysis with an investment card." },
  { key: "call", label: "Call", hint: "A short BUY/SELL call with an investment card." },
  { key: "short_post", label: "Post", hint: "Commentary. Does not feed your track record." },
];

export function ComposeEditor({ analystReportPrice }: { analystReportPrice: number | null }) {
  const [type, setType] = useState<ContentType>("research");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<Direction>("long");
  const [target, setTarget] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [access, setAccess] = useState<AccessType>("free");
  const [price, setPrice] = useState(analystReportPrice ?? 7);
  const [draftId, setDraftId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [savingDraft, startDraft] = useTransition();

  const hasCard = type !== "short_post";

  function buildInput(): ComposeInput {
    return {
      id: draftId,
      type,
      title: type === "short_post" ? null : title,
      summary,
      body: type === "short_post" ? null : body,
      access,
      price: access === "paid" ? Number(price) : null,
      ticker: hasCard ? ticker : null,
      direction: hasCard ? direction : undefined,
      target_price: hasCard && target ? Number(target) : null,
      horizon_days: hasCard ? horizon : undefined,
    };
  }

  function onSaveDraft() {
    setError(null);
    startDraft(async () => {
      try {
        const res = await saveDraft(buildInput());
        setDraftId(res.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save draft");
      }
    });
  }

  function onPublish() {
    setError(null);
    if (hasCard && !ticker.trim()) {
      setError("Add a ticker for research and calls.");
      return;
    }
    if (!summary.trim()) {
      setError("Add a short summary.");
      return;
    }
    start(async () => {
      try {
        await publishReport(buildInput());
      } catch (e) {
        // redirect() throws a control-flow signal; ignore it.
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message);
        }
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Editor */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-surface p-1">
            {types.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cn(
                  "flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors",
                  type === t.key ? "bg-accent text-accent-ink" : "text-text-mute hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="t-meta">{types.find((t) => t.key === type)?.hint}</p>
        </div>

        {type !== "short_post" && (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="t-h2 w-full bg-transparent placeholder:text-text-faint focus:outline-none"
          />
        )}

        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={type === "short_post" ? 5 : 2}
          placeholder={type === "short_post" ? "What's on your mind?" : "One-line summary shown in feeds"}
          className={cn(inputClass, "resize-none")}
        />

        {type !== "short_post" && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            placeholder="Write your analysis. Make the case."
            className={cn(inputClass, "resize-y leading-relaxed")}
          />
        )}

        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      </div>

      {/* Settings */}
      <aside className="flex flex-col gap-5">
        {hasCard && (
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h3 className="t-eyebrow mb-3">Investment card</h3>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Ticker
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="NVDA"
                  className={cn(inputClass, "num")}
                />
              </label>
              <div className="flex flex-col gap-1 text-sm">
                Direction
                <div className="inline-flex rounded-[var(--radius-btn)] border border-border p-1">
                  {(["long", "short", "hold"] as Direction[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={cn(
                        "flex-1 rounded-[6px] px-2 py-1 text-xs capitalize transition-colors",
                        direction === d ? "bg-surface-2 text-text" : "text-text-mute",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                Target price (optional)
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  type="number"
                  placeholder="142.00"
                  className={cn(inputClass, "num")}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Horizon (days)
                <input
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value) || 30)}
                  type="number"
                  min={1}
                  max={365}
                  className={cn(inputClass, "num")}
                />
              </label>
              <p className="t-meta">
                Entry price locks from the live feed at publish. The call is graded automatically
                when the horizon ends.
              </p>
            </div>
          </section>
        )}

        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h3 className="t-eyebrow mb-3">Access</h3>
          <div className="flex flex-col gap-2">
            {(
              [
                { k: "free", label: "Free for everyone" },
                { k: "subscribers", label: "Subscribers only" },
                { k: "paid", label: "Pay-per-report" },
              ] as { k: AccessType; label: string }[]
            ).map((opt) => (
              <label key={opt.k} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="access"
                  checked={access === opt.k}
                  onChange={() => setAccess(opt.k)}
                  className="accent-[var(--accent)]"
                />
                {opt.label}
              </label>
            ))}
            {access === "paid" && (
              <label className="mt-1 flex flex-col gap-1 text-sm">
                Price (USD)
                <input
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  type="number"
                  min={1}
                  max={50}
                  className={cn(inputClass, "num")}
                />
              </label>
            )}
          </div>
        </section>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={savingDraft} onClick={onSaveDraft}>
            {savingDraft ? "Saving..." : "Save draft"}
          </Button>
          <Button className="flex-1" disabled={pending} onClick={onPublish}>
            {pending ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
