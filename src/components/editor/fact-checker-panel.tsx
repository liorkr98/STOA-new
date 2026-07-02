"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle,
  Warning,
  ChatCircle,
  Info,
  MagnifyingGlass,
  Coins,
} from "@phosphor-icons/react";
import type { FactCheckResult, FactClaim, ClaimType } from "@/lib/ai/fact-check";
import { AI_COST } from "@/lib/ai/credits";
import { Button } from "@/components/ui/button";

const TYPE_STYLE: Record<
  ClaimType,
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  Fact: { icon: CheckCircle, color: "var(--up)", label: "Verified" },
  "Yahoo-Verified": { icon: CheckCircle, color: "var(--up)", label: "Yahoo verified" },
  Opinion: { icon: ChatCircle, color: "var(--accent)", label: "Opinion" },
  Misleading: { icon: Warning, color: "var(--text-mute)", label: "Misleading" },
  Unverified: { icon: Info, color: "var(--text-faint)", label: "Unverified" },
  "Yahoo-Disputed": { icon: Warning, color: "var(--down)", label: "Disputed" },
};

function ClaimRow({ claim }: { claim: FactClaim }) {
  const cfg = TYPE_STYLE[claim.type] ?? TYPE_STYLE.Unverified;
  const Icon = cfg.icon;
  return (
    <div
      className="rounded-[var(--radius-btn)] border border-border bg-bg/50 p-3"
      style={{ borderColor: `color-mix(in srgb, ${cfg.color} 25%, var(--border))` }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={14} style={{ color: cfg.color }} weight="fill" />
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        {claim.confidence && claim.type !== "Unverified" && (
          <span className="t-meta text-[10px]">{claim.confidence}</span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-text">{claim.text}</p>
      {claim.note && <p className="t-meta mt-1 italic">{claim.note}</p>}
      {claim.yahooCheck && (
        <p
          className="mt-1.5 text-[11px]"
          style={{ color: claim.yahooCheck.match ? "var(--up)" : "var(--down)" }}
        >
          Yahoo: {claim.yahooCheck.detail}
        </p>
      )}
    </div>
  );
}

export function FactCheckerPanel({
  text,
  initialResult,
  onResult,
  onCreditsChange,
  credits,
}: {
  text: string;
  initialResult?: FactCheckResult | null;
  onResult: (r: FactCheckResult) => void;
  onCreditsChange?: (n: number) => void;
  credits: number;
}) {
  const [result, setResult] = useState<FactCheckResult | null>(initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/ai/fact-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = (await res.json()) as FactCheckResult & {
          error?: string;
          have?: number;
          need?: number;
          credits_remaining?: number;
        };
        if (!res.ok) {
          if (res.status === 402) {
            setError(`Need ${data.need} credits (you have ${data.have}). Convert balance in Wallet.`);
          } else {
            setError(data.error ?? "Fact-check failed");
          }
          return;
        }
        const r = { claims: data.claims, checked_at: data.checked_at };
        setResult(r);
        onResult(r);
        if (typeof data.credits_remaining === "number") {
          onCreditsChange?.(data.credits_remaining);
        }
      } catch {
        setError("Could not run fact-check.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MagnifyingGlass size={16} className="text-accent" />
          <p className="t-eyebrow">Fact-check</p>
        </div>
        <span className="flex items-center gap-1 t-meta text-[11px]">
          <Coins size={13} />
          {credits} credits
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending || !text.trim() || credits < AI_COST.factCheck}
        onClick={run}
      >
        {pending ? "Checking..." : `Run fact-check (${AI_COST.factCheck} credits)`}
      </Button>

      {error && <p className="text-sm text-[var(--down)]">{error}</p>}

      {!result && !pending && (
        <p className="t-meta text-[11px]">
          Required before publishing. Claims are classified and checked against live market data.
        </p>
      )}

      {result && (
        <>
          <p className="t-meta text-[11px]">
            {result.claims.length} claim{result.claims.length === 1 ? "" : "s"} checked
            {result.claims.some((c) => c.type === "Yahoo-Disputed" || c.type === "Misleading")
              ? " · some need attention"
              : ""}
          </p>
          <div className="scroll-area flex max-h-56 flex-col gap-2 overflow-y-auto">
            {result.claims.map((c, i) => (
              <ClaimRow key={i} claim={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
