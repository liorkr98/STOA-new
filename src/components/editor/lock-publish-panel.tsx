"use client";

import { useRef, useState } from "react";
import { Check, Lock, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import type { AccessType, Direction } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import type { SymbolLookup } from "@/lib/market/use-symbol-lookup";
import { attestPrice, type AttestedPriceData } from "@/services/price-attestation";
import { PlanTierSelect } from "@/components/profile/plan-tier-select";
import { PerkAccessSelect } from "@/components/profile/perk-access-select";
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
 * What the block says under the ticker field once it has looked the symbol
 * up. A typo and a real name look the same in the field, and until publish
 * nothing used to tell them apart; this is the tell. The company name says
 * "this is the one you meant", the level beside it is what the call would
 * lock at, and a Treasury tenor says out loud that its level is a yield.
 */
function SymbolStatus({ lookup, onRetry }: { lookup: SymbolLookup; onRetry?: () => void }) {
  if (lookup.status === "idle") return null;
  if (lookup.status === "checking") {
    return (
      <p className="t-meta mt-2 text-[11px]" aria-live="polite">
        Checking {lookup.symbol}...
      </p>
    );
  }
  if (lookup.status === "missing") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--down)]" role="alert">
        <X size={13} aria-hidden className="mt-px shrink-0" />
        <span>
          <span className="num font-semibold">{lookup.symbol}</span> was not found. Check the symbol:
          a call on a name that cannot be priced can never be graded.
        </span>
      </p>
    );
  }
  if (lookup.status === "failed") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--down)]" role="alert">
        <X size={13} aria-hidden className="mt-px shrink-0" />
        <span>
          Could not check {lookup.symbol} just now.{" "}
          {onRetry ? (
            <button type="button" onClick={onRetry} className="underline focus-ring rounded">
              Try again
            </button>
          ) : null}
        </span>
      </p>
    );
  }
  const r = lookup.resolved;
  const what =
    r.kind === "equity"
      ? [r.name, r.exchange].filter(Boolean).join(" · ")
      : [r.name, r.quotedAsYield ? "quoted as a yield" : r.unit].filter(Boolean).join(" · ");
  return (
    <div className="mt-2" aria-live="polite">
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-text-mute">
        <Check size={13} aria-hidden className="mt-px shrink-0 text-[var(--verdigris)]" />
        <span>
          <span className="num font-semibold text-text">{r.symbol}</span>
          {what ? <span> · {what}</span> : <span> · recognised, priced live</span>}
        </span>
      </p>
      {r.directionNote ? (
        <p className="t-meta mt-1 pl-[19px] text-[11px] leading-snug">{r.directionNote}</p>
      ) : null}
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
  sections = "all",
  hasCard,
  ticker,
  onTicker,
  lookup = { status: "idle" },
  onRetryLookup,
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
  membersIncluded,
  onMembersIncluded,
  minPlanRank,
  onMinPlanRank,
  requiredPerks,
  onRequiredPerks,
  plans,
  disclosure,
  onDisclosure,
  publishLabel,
  publishDisabledReason,
  onPublish,
  pending,
  error,
  promote,
  frozen = false,
}: {
  hasCard: boolean;
  ticker: string;
  onTicker: (v: string) => void;
  /**
   * What the editor knows about the symbol in the field. The editor owns the
   * lookup because the step's forward button reads it too; the panel only
   * shows it.
   */
  lookup?: SymbolLookup;
  onRetryLookup?: () => void;
  /** Null until chosen. Pressing the chosen one again clears it. */
  direction: Direction | null;
  onDirection: (v: Direction | null) => void;
  /**
   * The call belongs to a live publication and cannot change. The fields are
   * replaced by a plain statement of what was locked.
   */
  frozen?: boolean;
  target: string;
  onTarget: (v: string) => void;
  horizon: number;
  onHorizon: (v: number) => void;
  access: AccessType;
  onAccess: (v: AccessType) => void;
  price: number;
  onPrice: (v: number) => void;
  membersIncluded: boolean;
  onMembersIncluded: (v: boolean) => void;
  minPlanRank: number;
  onMinPlanRank: (v: number) => void;
  requiredPerks: string[];
  onRequiredPerks: (v: string[]) => void;
  plans: Plan[];
  disclosure: DisclosureState;
  onDisclosure: (d: DisclosureState) => void;
  publishLabel: string;
  publishDisabledReason: string | null;
  onPublish: () => void;
  pending: boolean;
  error: string | null;
  /** The Promote section, injected so its cost model stays pluggable. */
  promote?: React.ReactNode;
  /**
   * Which part of the panel to render. The guided sequence asks for the call
   * in its own step and the publishing settings in the last one, so the same
   * panel is mounted twice rather than duplicating the ticker, the live quote
   * and the price attestation. "all" is the original single panel.
   */
  sections?: "call" | "publish" | "all";
}) {
  // The live level is what the call would lock at. It comes from the lookup
  // rather than a second quote request, so the price shown and the name shown
  // are always about the same symbol.
  const resolved = lookup.status === "found" ? lookup.resolved : null;
  const live = hasCard && resolved ? resolved.price : null;
  const quotedAsYield = resolved?.quotedAsYield ?? false;
  const [committedTicker, setCommittedTicker] = useState("");
  const [attestationLoading, setAttestationLoading] = useState(false);
  const [attestationError, setAttestationError] = useState<string | null>(null);
  const [attestationData, setAttestationData] = useState<AttestedPriceData | null>(null);
  const lastAttestedRef = useRef<{ ticker: string; data: AttestedPriceData | null }>({
    ticker: "",
    data: null,
  });

  function resetAttestation() {
    setCommittedTicker("");
    setAttestationLoading(false);
    setAttestationError(null);
    setAttestationData(null);
    lastAttestedRef.current = { ticker: "", data: null };
  }

  async function attestLockedTicker(raw: string) {
    const normalized = raw.trim().toUpperCase();
    if (!normalized || !/^[A-Z]{1,5}(\.TA)?$/.test(normalized)) {
      resetAttestation();
      return;
    }

    if (lastAttestedRef.current.ticker === normalized && lastAttestedRef.current.data) {
      setCommittedTicker(normalized);
      setAttestationData(lastAttestedRef.current.data);
      setAttestationError(null);
      setAttestationLoading(false);
      return;
    }

    setCommittedTicker(normalized);
    setAttestationLoading(true);
    setAttestationError(null);
    setAttestationData(null);

    const market = normalized.endsWith(".TA") ? "IL" : "US";
    const result = await attestPrice({ ticker: normalized, market });
    if (result.success) {
      lastAttestedRef.current = { ticker: normalized, data: result.data };
      setAttestationData(result.data);
      setAttestationError(null);
    } else {
      lastAttestedRef.current = { ticker: normalized, data: null };
      setAttestationData(null);
      setAttestationError(result.error);
    }
    setAttestationLoading(false);
  }

  function onTickerInputChange(value: string) {
    const next = value.toUpperCase();
    onTicker(next);
    const normalized = next.trim().toUpperCase();
    if (!normalized) {
      resetAttestation();
      return;
    }
    if (committedTicker && normalized !== committedTicker) {
      setCommittedTicker("");
      setAttestationData(null);
      setAttestationError(null);
      lastAttestedRef.current = { ticker: "", data: null };
    }
  }

  function commitTickerFromField() {
    void attestLockedTicker(ticker);
  }

  const targetNum = Number(target);
  // A yield is compared in points, not percent: 4.2% to 4.5% is a move of
  // 0.30, and calling it "+7.1%" would read as a price move it is not.
  const move =
    live != null && target && Number.isFinite(targetNum) && live > 0
      ? quotedAsYield
        ? targetNum - live
        : ((targetNum - live) / live) * 100
      : null;
  const moveLabel =
    move == null
      ? null
      : quotedAsYield
        ? `${move >= 0 ? "+" : ""}${move.toFixed(2)} pts`
        : `${move >= 0 ? "+" : ""}${move.toFixed(1)}%`;
  const moveAgreesWithCall =
    move != null && (direction === "long" ? move >= 0 : direction === "short" ? move <= 0 : true);

  return (
    <div className="flex flex-col gap-4">
      {hasCard && sections !== "publish" && frozen && (
        <section
          className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
          aria-label="The locked call"
        >
          <p className="t-eyebrow mb-2">The call</p>
          {ticker.trim() ? (
            <>
              <p className="num text-lg font-semibold">{ticker.trim().toUpperCase()}</p>
              <p className="t-meta mt-1 text-[11px] leading-relaxed">
                Locked when this was published, with its entry price and horizon. It cannot
                change, and neither can its resolution: those are the record.
              </p>
            </>
          ) : (
            <p className="t-meta text-[11px] leading-relaxed">
              This publication went out without a call, and one cannot be added to it now.
            </p>
          )}
        </section>
      )}

      {hasCard && sections !== "publish" && !frozen && (
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
            Add a ticker to lock a call at publish. Leave blank if this piece has no target.
            Stocks go by ticker; gold is XAUUSD, WTI crude USOIL, Brent UKOIL, the ten-year
            US10Y, bitcoin BTCUSD.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="text-xs font-medium text-text-mute">
              Ticker
              <input
                value={ticker}
                onChange={(e) => onTickerInputChange(e.target.value)}
                onBlur={commitTickerFromField}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTickerFromField();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-invalid={lookup.status === "missing" || undefined}
                className={cn(
                  inputClass,
                  "num mt-1",
                  lookup.status === "missing" && "border-[var(--down)]",
                )}
                placeholder="NVDA"
              />
            </label>
            <label className="text-xs font-medium text-text-mute">
              {quotedAsYield ? "Target yield" : "Target price"}
              <input
                value={target}
                onChange={(e) => onTarget(e.target.value)}
                type="number"
                min={0}
                step={quotedAsYield ? "0.001" : "0.01"}
                className={cn(inputClass, "num mt-1")}
                placeholder="Optional"
              />
            </label>
          </div>

          <SymbolStatus lookup={lookup} onRetry={onRetryLookup} />

          <div className="mt-2.5" role="radiogroup" aria-label="Direction">
            <p className="text-xs font-medium text-text-mute">
              Direction
              {direction === null ? (
                <span className="t-meta ml-1.5 text-[11px] font-normal">
                  choose one: a call is a ticker and a direction
                </span>
              ) : null}
            </p>
            <div className="mt-1 flex gap-1.5">
              {(["long", "short", "hold"] as Direction[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={direction === d}
                  onClick={() => onDirection(direction === d ? null : d)}
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
          </div>

          <div className="mt-2.5">
            <HorizonPicker value={horizon} onChange={onHorizon} />
          </div>

          {resolved && (
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <div className="flex items-baseline justify-between">
                <span className="t-meta">{quotedAsYield ? "Current yield" : "Current"}</span>
                <span className="num text-lg font-semibold">{resolved.priceLabel ?? "-"}</span>
              </div>
              {resolved.priceLabel ? (
                <p className="t-meta mt-0.5 text-[11px]">
                  This is the level the call locks at when you publish.
                </p>
              ) : (
                <p className="t-meta mt-0.5 text-[11px]">
                  No live level right now. Publishing locks whatever the feed says then.
                </p>
              )}
              {moveLabel != null && (
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="t-meta">To target</span>
                  <span
                    className="num text-sm font-semibold"
                    style={{ color: moveAgreesWithCall ? "var(--up)" : "var(--down)" }}
                  >
                    {moveLabel}
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

          {committedTicker && (
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <PriceAttestationCard
                title="Attestation protocol"
                loading={attestationLoading}
                error={attestationError}
                data={attestationData}
              />
            </div>
          )}
        </section>
      )}

      {sections !== "call" && (
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
          <>
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
          <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={membersIncluded}
              onChange={(e) => onMembersIncluded(e.target.checked)}
              className="mt-0.5 accent-[var(--ink)]"
            />
            <span>
              <span className="font-medium">Members can open this without paying</span>
              <span className="t-meta mt-0.5 block text-[11px]">
                Anyone subscribed to you is entitled, same as a buyer.
              </span>
            </span>
          </label>
          </>
        )}
        {access === "subscribers" && (
          <>
            <PlanTierSelect plans={plans} value={minPlanRank} onChange={onMinPlanRank} />
            <PerkAccessSelect plans={plans} value={requiredPerks} onChange={onRequiredPerks} />
          </>
        )}
      </section>
      )}

      {sections !== "call" ? promote : null}

      {sections !== "call" && (
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

      {sections !== "call" && (
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={pending || publishDisabledReason != null} onClick={onPublish}>
          <Lock size={18} aria-hidden />
          {pending ? "Publishing..." : publishLabel}
        </Button>
        {publishDisabledReason && (
          <p className="t-meta text-center text-[11px]">{publishDisabledReason}</p>
        )}
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
        <p className="t-meta text-center text-[11px] text-text-faint">
          A locked call cannot be edited. The headline, the text and the tags can be, and
          every edit is shown on the publication.
        </p>
      </div>
      )}
    </div>
  );
}
