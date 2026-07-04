"use client";

import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { BrandAnalyzeInput, BrandAnalyzeResult, BrandSuggestion } from "@/lib/profile/brand-analyze";

export function BrandAnalyzerPanel({
  input,
  credits,
  onCreditsChange,
  onApply,
}: {
  input: BrandAnalyzeInput;
  credits: number;
  onCreditsChange: (n: number) => void;
  onApply: (field: BrandSuggestion["field"], value: string | string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BrandAnalyzeResult | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/brand-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as BrandAnalyzeResult & {
        error?: string;
        have?: number;
        need?: number;
        credits_remaining?: number;
      };
      if (!res.ok) {
        setError(
          data.error === "insufficient_credits"
            ? `Need ${data.need} credits (you have ${data.have}).`
            : (data.error ?? "Analysis failed"),
        );
        return;
      }
      if (typeof data.credits_remaining === "number") onCreditsChange(data.credits_remaining);
      setResult(data);
    } catch {
      setError("AI unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div>
        <h2 className="t-h3">AI brand analyzer</h2>
        <p className="t-meta mt-1">
          Scores your storefront copy and suggests improvements. Uses {2} AI credits per run.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void analyze()}>
          <Sparkle size={16} className="text-accent" />
          {loading ? "Analyzing..." : "Analyze my brand"}
        </Button>
        <span className="t-meta text-[11px]">{credits} credits left</span>
      </div>

      {error && (
        <p className="rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
          {error}
        </p>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(result.scores).map(([key, score]) => (
              <div key={key} className="rounded-[var(--radius-btn)] border border-border bg-bg p-3">
                <p className="t-meta text-[10px] capitalize">{key.replace("_", " ")}</p>
                <p className="num mt-1 text-xl font-semibold">{score}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-accent" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {result.warnings.length > 0 && (
            <ul className="list-inside list-disc text-sm text-text-mute">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {result.suggestions.length > 0 && (
            <div className="flex flex-col gap-3">
              {result.suggestions.map((s, i) => (
                <div key={i} className="rounded-[var(--radius-btn)] border border-border bg-surface-2 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{s.field}</p>
                  <p className="mt-2 text-sm">
                    {Array.isArray(s.proposed) ? s.proposed.join(", ") : s.proposed}
                  </p>
                  <p className="t-meta mt-1">{s.reason}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => onApply(s.field, s.proposed)}
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
