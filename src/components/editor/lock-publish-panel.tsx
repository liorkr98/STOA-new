"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { price as fmtPrice } from "@/lib/format";
import type { AccessType, Direction } from "@/lib/types";
import type { FactCheckResult } from "@/lib/ai/fact-check";
import type { Plan } from "@/lib/db/plans";
import { attestPrice, type AttestedPriceData } from "@/services/price-attestation";
import { PlanTierSelect } from "@/components/profile/plan-tier-select";
import { PerkAccessSelect } from "@/components/profile/perk-access-select";
import { FactCheckerPanel } from "@/components/editor/fact-checker-panel";
import { HorizonPicker } from "@/components/editor/horizon-picker";
import { PriceAttestationCard } from "@/components/ui/price-attestation-card";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-mute";

export interface DisclosureState {
  positionHeld: boolean | null;
  compTied: boolean | null;
  compDetail: string;
  viewsCertified: boolean;
}

export function disclosuresAnswered(d: DisclosureState): boolean {
  return d.positionHeld !== null && d.compTied !== null && d.viewsCertified;
}

function YesNo({
  value,
  onChange,
  idBase,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  idBase: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={idBase} className="flex gap-1.5">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-[var(--radius-btn)] border px-3 py-1 text-xs font-medium transition-colors focus-ring",
            value === v
              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
              : "border-border text-text-mute hover:border-border-strong hover:text-text",
          )}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

/**
 * The persistent right-rail "Lock & Publish" panel (FRONTEND.md 6.2). Keeps
 * every requirement of the irreversible action visible while writing, rather
 * than surprising the author with a checklist at the end. Dashed borders on
 * the price-target module are the "still editing" chrome; the reading view's
 * locked call block is the solid ledger-card counterpart.
 */
export function LockPublishPanel({
  hasCard,
  ticker,
  onTicker,
  direction,
  onDirection,
  target,
  onTarget,
  horizon,
  onHorizon,
  access,
  onAccess,
  price,
  onPrice,
  minPlanRank,
  onMinPlanRank,
  requiredPerks,
  onRequiredPerks,
  plans,
  plainText,
  credits,
  onCreditsChange,
  factCheck,
  onFactCheck,
  disclosure,
  onDisclosure,
  publishLabel,
  publishDisabledReason,
  onPublish,
  pending,
  error,
}: {
  hasCard: boolean;
  ticker: string;
  onTicker: (v: string) => void;
  direction: Direction;
  onDirection: (v: Direction) => void;
  target: string;
  onTarget: (v: string) => void;
  horizon: number;
  onHorizon: (v: number) => void;
  access: AccessType;
  onAccess: (v: AccessType) => void;
  price: number;
  onPrice: (v: number) => void;
  minPlanRank: number;
  onMinPlanRank: (v: number) => void;
  requiredPerks: string[];
  onRequiredPerks: (v: string[]) => void;
  plans: Plan[];
  plainText: string;
  credits: number;
  onCreditsChange: (n: number) => void;
  factCheck: FactCheckResult | null;
  onFactCheck: (r: FactCheckResult) => void;
  disclosure: DisclosureState;
  onDisclosure: (d: DisclosureState) => void;
  publishLabel: string;
  publishDisabledReason: string | null;
  onPublish: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [live, setLive] = useState<number | null>(null);
  const [attestationLoading, setAttestationLoading] = useState(false);
  const [attestationError, setAttestationError] = useState<string | null>(null);
  const [attestationData, setAttestationData] = useState<AttestedPriceData | null>(null);
  const lastAttestedRef = useRef<{ ticker: string; data: AttestedPriceData | null }>({
    ticker: "",
    data: null,
  });

  useEffect(() => {
    if (!hasCard || !ticker.trim()) {
      setLive(null);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/market/quote?ticker=${encodeURIComponent(ticker.trim())}`, {
        signal: controller.signal,
      })
        .then(async (r) => {
          if (!r.ok) return null;
          try {
            return (await r.json()) as { price?: number };
          } catch {
            return null;
          }
        })
        .then((j) => setLive(j?.price ?? null))
        .catch(() => setLive(null));
    }, 600);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [ticker, hasCard]);

  useEffect(() => {
    if (!hasCard || !ticker.trim()) {
      setAttestationLoading(false);
      setAttestationError(null);
      setAttestationData(null);
      lastAttestedRef.current = { ticker: "", data: null };
      return;
    }

    const normalized = ticker.trim().toUpperCase();
    if (!/^[A-Z]{1,5}(\.TA)?$/.test(normalized)) {
      setAttestationLoading(false);
      setAttestationError(null);
      setAttestationData(null);
      return;
    }

    if (lastAttestedRef.current.ticker === normalized && lastAttestedRef.current.data) {
      setAttestationData(lastAttestedRef.current.data);
      setAttestationLoading(false);
      setAttestationError(null);
      return;
    }

    const market = normalized.endsWith(".TA") ? "IL" : "US";
    let cancelled = false;
    const timer = setTimeout(() => {
      setAttestationLoading(true);
      setAttestationError(null);
      void attestPrice({ ticker: normalized, market })
        .then((result) => {
          if (cancelled) return;
          if (result.success) {
            lastAttestedRef.current = { ticker: normalized, data: result.data };
            setAttestationData(result.data);
            setAttestationError(null);
          } else {
            lastAttestedRef.current = { ticker: normalized, data: null };
            setAttestationData(null);
            setAttestationError(result.error);
          }
        })
        .catch(() => {
          if (cancelled) return;
          lastAttestedRef.current = { ticker: normalized, data: null };
          setAttestationData(null);
          setAttestationError("Unable to lock an attested quote right now.");
        })
        .finally(() => {
          if (cancelled) return;
          setAttestationLoading(false);
        });
    }, 1400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ticker, hasCard]);

  const targetNum = Number(target);
  const move =
    live != null && target && Number.isFinite(targetNum) && live > 0
      ? ((targetNum - live) / live) * 100
      : null;
  const moveAgreesWithCall =
    move != null && (direction === "long" ? move >= 0 : direction === "short" ? move <= 0 : true);

  return (
    <div className="flex flex-col gap-4">
      {hasCard && (
        <section
          className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface p-4"
          aria-label="Price target"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="t-eyebrow">Price target</p>
            <span className="t-meta flex items-center gap-1 text-[11px]">
              <Lock size={13} aria-hidden />
              optional
            </span>
          </div>
          <p className="t-meta mb-3 text-[11px] leading-relaxed">
            Add a ticker to lock a call at publish. Leave blank for overview research.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="text-xs font-medium text-text-mute">
              Ticker
              <input
                value={ticker}
                onChange={(e) => onTicker(e.target.value.toUpperCase())}
                className={cn(inputClass, "num mt-1")}
                placeholder="NVDA"
              />
            </label>
            <label className="text-xs font-medium text-text-mute">
              Target price
              <input
                value={target}
                onChange={(e) => onTarget(e.target.value)}
                type="number"
                min={0}
                step="0.01"
                className={cn(inputClass, "num mt-1")}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="mt-2.5 flex gap-1.5">
            {(["long", "short", "hold"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDirection(d)}
                className={cn(
                  "flex-1 rounded-[var(--radius-btn)] border py-1.5 text-xs font-medium capitalize transition-colors focus-ring",
                  direction === d
                    ? "border-accent bg-accent-weak text-accent"
                    : "border-border text-text-mute hover:text-text",
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="mt-2.5">
            <HorizonPicker value={horizon} onChange={onHorizon} />
          </div>

          {ticker.trim() && (
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <div className="flex items-baseline justify-between">
                <span className="t-meta">Current</span>
                <span className="num text-lg font-semibold">
                  {live != null ? `$${fmtPrice(live)}` : "-"}
                </span>
              </div>
              {move != null && (
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="t-meta">To target</span>
                  <span
                    className="num text-sm font-semibold"
                    style={{ color: moveAgreesWithCall ? "var(--up)" : "var(--down)" }}
                  >
                    {move >= 0 ? "+" : ""}
                    {move.toFixed(1)}%
                  </span>
                </div>
              )}
              {move != null && !moveAgreesWithCall && (
                <p className="t-meta mt-1.5 text-[11px] text-[var(--down)]">
                  Target moves against a {direction} call. Double-check the number.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {hasCard && (
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <FactCheckerPanel
            text={plainText}
            credits={credits}
            initialResult={factCheck}
            onCreditsChange={onCreditsChange}
            onResult={onFactCheck}
          />
        </section>
      )}

      {hasCard && (
        <PriceAttestationCard
          title="Attestation protocol"
          loading={attestationLoading}
          error={attestationError}
          data={attestationData}
        />
      )}

      {hasCard && (
        <section className="ledger-card p-4" aria-label="Disclosures">
          <p className="t-eyebrow mb-3">Disclosures</p>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <span id="disc-position" className="text-xs leading-snug text-text">
                Do you hold a position in {ticker.trim() ? ticker : "this ticker"}?
              </span>
              <YesNo
                idBase="disc-position"
                value={disclosure.positionHeld}
                onChange={(v) => onDisclosure({ ...disclosure, positionHeld: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span id="disc-comp" className="text-xs leading-snug text-text">
                Is any compensation tied to this call?
              </span>
              <YesNo
                idBase="disc-comp"
                value={disclosure.compTied}
                onChange={(v) => onDisclosure({ ...disclosure, compTied: v })}
              />
            </div>

            {disclosure.compTied === true && (
              <input
                value={disclosure.compDetail}
                onChange={(e) => onDisclosure({ ...disclosure, compDetail: e.target.value })}
                className={cn(inputClass, "text-xs")}
                placeholder="Describe the arrangement (shown to readers)"
                maxLength={500}
              />
            )}

            <label className="flex items-start gap-2.5 text-xs leading-snug text-text">
              <input
                type="checkbox"
                checked={disclosure.viewsCertified}
                onChange={(e) =>
                  onDisclosure({ ...disclosure, viewsCertified: e.target.checked })
                }
                className="mt-0.5 accent-[var(--accent)]"
              />
              I certify these are my own views and the analysis is my own work.
            </label>
          </div>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <p className="t-eyebrow mb-2.5">Access</p>
        <div className="flex flex-col gap-1.5 text-sm">
          {(
            [
              { key: "free", label: "Free", hint: "Anyone can read" },
              { key: "subscribers", label: "Subscribers", hint: "Your subscribers only" },
              { key: "paid", label: "Paid unlock", hint: "One-time purchase" },
            ] as { key: AccessType; label: string; hint: string }[]
          ).map((a) => (
            <label
              key={a.key}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-[var(--radius-btn)] border px-3 py-2 transition-colors",
                access === a.key ? "border-accent bg-accent-weak" : "border-border hover:border-border-strong",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="access"
                  checked={access === a.key}
                  onChange={() => onAccess(a.key)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm font-medium">{a.label}</span>
              </span>
              <span className="t-meta text-[11px]">{a.hint}</span>
            </label>
          ))}
        </div>
        {access === "paid" && (
          <label className="mt-2.5 block text-xs font-medium text-text-mute">
            Price (you keep 90%)
            <div className="relative mt-1">
              <span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-faint">
                $
              </span>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => onPrice(Number(e.target.value))}
                className={cn(inputClass, "num pl-7")}
              />
            </div>
          </label>
        )}
        {access === "subscribers" && (
          <>
            <PlanTierSelect plans={plans} value={minPlanRank} onChange={onMinPlanRank} />
            <PerkAccessSelect plans={plans} value={requiredPerks} onChange={onRequiredPerks} />
          </>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={pending || publishDisabledReason != null} onClick={onPublish}>
          <Lock size={18} aria-hidden />
          {pending ? "Publishing..." : publishLabel}
        </Button>
        {publishDisabledReason && (
          <p className="t-meta text-center text-[11px]">{publishDisabledReason}</p>
        )}
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      </div>
    </div>
  );
}
