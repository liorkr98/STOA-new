"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import type { AccessType, Direction } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import type { SymbolLookup } from "@/lib/market/use-symbol-lookup";
import { PlanTierSelect } from "@/components/profile/plan-tier-select";
import { PerkAccessSelect } from "@/components/profile/perk-access-select";

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
 * "this is the one you meant", and a Treasury tenor says out loud that its
 * level is a yield.
 */
function SymbolStatus({
  lookup,
  onRetry,
}: {
  lookup: SymbolLookup;
  onRetry?: () => void;
}) {
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
      <p
        className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--down)]"
        role="alert"
      >
        <X size={13} aria-hidden className="mt-px shrink-0" />
        <span>
          <span className="num font-semibold">{lookup.symbol}</span> was not
          found. Check the symbol.
        </span>
      </p>
    );
  }
  if (lookup.status === "failed") {
    return (
      <p
        className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--down)]"
        role="alert"
      >
        <X size={13} aria-hidden className="mt-px shrink-0" />
        <span>
          Could not check {lookup.symbol} just now.{" "}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="underline focus-ring rounded"
            >
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
      : [r.name, r.quotedAsYield ? "quoted as a yield" : r.unit]
          .filter(Boolean)
          .join(" · ");
  return (
    <div className="mt-2" aria-live="polite">
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-text-mute">
        <Check
          size={13}
          aria-hidden
          className="mt-px shrink-0 text-[var(--verdigris)]"
        />
        <span>
          <span className="num font-semibold text-text">{r.symbol}</span>
          {what ? (
            <span> · {what}</span>
          ) : (
            <span> · recognised, priced live</span>
          )}
        </span>
      </p>
      {r.directionNote ? (
        <p className="t-meta mt-1 pl-[19px] text-[11px] leading-snug">
          {r.directionNote}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The stance: the publication's ticker and its direction. A live
 * publication's stance is frozen with its ticker, so the fields are replaced
 * by a plain statement of it.
 */
export function StancePanel({
  ticker,
  onTicker,
  lookup = { status: "idle" },
  onRetryLookup,
  direction,
  onDirection,
  frozen = false,
}: {
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
  frozen?: boolean;
}) {
  if (frozen) {
    return (
      <section
        className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
        aria-label="The stance"
      >
        <p className="t-eyebrow mb-2">The stance</p>
        {ticker.trim() ? (
          <>
            <p className="num text-lg font-semibold">
              {ticker.trim().toUpperCase()}
              {direction ? (
                <span className="ml-2 capitalize">{direction}</span>
              ) : null}
            </p>
            <p className="t-meta mt-1 text-[11px] leading-relaxed">
              Set when this was published. It cannot change.
            </p>
          </>
        ) : (
          <p className="t-meta text-[11px] leading-relaxed">
            This publication went out without a stance, and one cannot be added
            to it now.
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface p-4"
      aria-label="The stance"
    >
      <p className="t-eyebrow mb-3">The stance</p>

      <label className="block text-xs font-medium text-text-mute">
        Ticker
        <input
          value={ticker}
          onChange={(e) => onTicker(e.target.value.toUpperCase())}
          aria-invalid={lookup.status === "missing" || undefined}
          className={cn(
            inputClass,
            "num mt-1",
            lookup.status === "missing" && "border-[var(--down)]",
          )}
          placeholder="NVDA"
        />
      </label>

      <SymbolStatus lookup={lookup} onRetry={onRetryLookup} />

      <div className="mt-2.5" role="radiogroup" aria-label="Direction">
        <p className="text-xs font-medium text-text-mute">Direction</p>
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
    </section>
  );
}

/**
 * The publish screen's settings (FRONTEND.md 6.2): access, the promote
 * section, the disclosures and the one button. Every requirement stays
 * visible here rather than surprising the author with a checklist at the end.
 */
export function PublishPanel({
  ticker,
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
  busyLabel,
  error,
  promote,
}: {
  /** The stance's ticker, named in the position disclosure. */
  ticker: string;
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
  /** What publishing is doing right now ("Capturing charts...", an upload's progress). */
  busyLabel?: string | null;
  error: string | null;
  /** The Promote section, injected so its cost model stays pluggable. */
  promote?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <p className="t-eyebrow mb-2.5">Access</p>
        <div className="flex flex-col gap-1.5 text-sm">
          {(
            [
              { key: "free", label: "Free", hint: "Anyone can read" },
              {
                key: "subscribers",
                label: "Subscribers",
                hint: "Your subscribers only",
              },
              { key: "paid", label: "Paid unlock", hint: "One-time purchase" },
            ] as { key: AccessType; label: string; hint: string }[]
          ).map((a) => (
            <label
              key={a.key}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-[var(--radius-btn)] border px-3 py-2 transition-colors",
                access === a.key
                  ? "border-accent bg-accent-weak"
                  : "border-border hover:border-border-strong",
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
              <span className="font-medium">
                Members can open this without paying
              </span>
            </label>
          </>
        )}
        {access === "subscribers" && (
          <>
            <PlanTierSelect
              plans={plans}
              value={minPlanRank}
              onChange={onMinPlanRank}
            />
            <PerkAccessSelect
              plans={plans}
              value={requiredPerks}
              onChange={onRequiredPerks}
            />
          </>
        )}
      </section>

      {promote}

      <section className="ledger-card p-4" aria-label="Disclosures">
        <p className="t-eyebrow mb-3">Disclosures</p>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <span id="disc-position" className="text-xs leading-snug text-text">
              Do you hold a position in {ticker.trim() ? ticker : "this ticker"}
              ?
            </span>
            <YesNo
              idBase="disc-position"
              value={disclosure.positionHeld}
              onChange={(v) => onDisclosure({ ...disclosure, positionHeld: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span id="disc-comp" className="text-xs leading-snug text-text">
              Is any compensation tied to this publication?
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
              onChange={(e) =>
                onDisclosure({ ...disclosure, compDetail: e.target.value })
              }
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
                onDisclosure({
                  ...disclosure,
                  viewsCertified: e.target.checked,
                })
              }
              className="mt-0.5 accent-[var(--accent)]"
            />
            I certify these are my own views and the analysis is my own work.
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          disabled={pending || publishDisabledReason != null}
          onClick={onPublish}
        >
          {pending ? (busyLabel ?? "Publishing...") : publishLabel}
        </Button>
        {publishDisabledReason && (
          <p className="t-meta text-center text-[11px]">
            {publishDisabledReason}
          </p>
        )}
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      </div>
    </div>
  );
}
