"use client";

import { Check, X } from "lucide-react";
import { exchangeTimeZoneFor, horizonDateFromNow } from "@/lib/engine/trading-calendar";
import { cn } from "@/lib/design/cn";
import type { Direction } from "@/lib/types";
import type { SymbolLookup } from "@/lib/market/use-symbol-lookup";
import {
  VERDICT_HORIZON_MAX_DAYS,
  VERDICT_HORIZON_MIN_DAYS,
  clampHorizon,
  formatMarketCap,
  verdictEligibility,
  type VerdictEligibility,
  type VerdictWindow,
} from "@/lib/compose/verdict";

const inputClass =
  "num w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2.5 text-[1.0625rem] focus-ring placeholder:text-text-faint";

/**
 * The verdict's call: one name, one direction, one target, one horizon.
 *
 * Everything the verdict's rules say is said here, as the analyst types,
 * rather than at publish: the name's market cap and whether it clears the
 * $2B cap, a macro instrument's ineligibility in plain words, the entry
 * the call will lock at, the move to target, and a horizon bounded to 7
 * to 180 days. The forward button reads the same eligibility this shows.
 */
export function VerdictCallPanel({
  ticker,
  onTicker,
  lookup,
  onRetryLookup,
  eligibility,
  direction,
  onDirection,
  target,
  onTarget,
  horizon,
  onHorizon,
  window: verdictWindow,
  frozen = false,
}: {
  ticker: string;
  onTicker: (v: string) => void;
  lookup: SymbolLookup;
  onRetryLookup?: () => void;
  /** The verdict's check on the found symbol, owned by the workspace. */
  eligibility: VerdictEligibility | null;
  direction: Direction | null;
  onDirection: (v: Direction | null) => void;
  target: string;
  onTarget: (v: string) => void;
  horizon: number;
  onHorizon: (v: number) => void;
  window: VerdictWindow;
  /** The call belongs to a live verdict and cannot change. */
  frozen?: boolean;
}) {
  const resolved = lookup.status === "found" ? lookup.resolved : null;
  const live = resolved?.price ?? null;
  const targetNum = Number(target);
  const move =
    live != null && target && Number.isFinite(targetNum) && live > 0
      ? ((targetNum - live) / live) * 100
      : null;
  const moveAgrees =
    move != null && (direction === "long" ? move >= 0 : direction === "short" ? move <= 0 : true);
  const resolvesOn = horizonDateFromNow(horizon, exchangeTimeZoneFor(ticker));
  const resolvesLabel = resolvesOn
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();

  if (frozen) {
    return (
      <section className="ledger-card p-4" aria-label="The locked call">
        <p className="t-eyebrow mb-2">The call</p>
        <p className="num text-lg font-semibold">
          {ticker.trim().toUpperCase()}
          {direction ? <span className="ml-2 text-[0.8125rem] uppercase tracking-[0.12em] text-text-mute">{direction}</span> : null}
        </p>
        <p className="t-meta mt-1 text-[11px] leading-relaxed">
          Locked when this verdict was published, with its entry price and horizon. It cannot
          change, and neither can its resolution: those are the record.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!verdictWindow.open ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--brass)]/50 bg-[var(--brass)]/10 p-3.5">
          <p className="num text-[10px] uppercase tracking-[0.16em] text-[var(--brass)]">
            {verdictWindow.line}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-text">
            One verdict per rolling thirty days. You can write this one now and it saves as a
            draft; it publishes once the window opens.
          </p>
        </div>
      ) : null}

      <section
        className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface p-4 md:p-5"
        aria-label="The call"
      >
        {/* The name. */}
        <p className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">Ticker</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="sr-only" htmlFor="verdict-ticker">
            Ticker
          </label>
          <input
            id="verdict-ticker"
            value={ticker}
            onChange={(e) => onTicker(e.target.value.toUpperCase())}
            aria-invalid={lookup.status === "missing" || (eligibility != null && !eligibility.ok) || undefined}
            className={cn(
              inputClass,
              "w-[10.5rem] uppercase tracking-[0.1em]",
              (lookup.status === "missing" || (eligibility && !eligibility.ok)) && "border-[var(--rust)]",
            )}
            placeholder="PLAB"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          {resolved ? (
            <div className="min-w-0">
              <p className="truncate font-display text-[1.125rem] font-semibold tracking-tight text-text">
                {resolved.name ?? resolved.symbol}
              </p>
              <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
                {resolved.kind === "equity"
                  ? resolved.marketCap != null
                    ? `Mkt cap ${formatMarketCap(resolved.marketCap)}`
                    : "Mkt cap not on file"
                  : `${resolved.unit ?? "macro instrument"}`}
              </p>
            </div>
          ) : null}
        </div>
        <EligibilityLine lookup={lookup} eligibility={eligibility} onRetry={onRetryLookup} />

        <div className="my-4 border-t border-border" />

        {/* Direction, entry, target. */}
        <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr_1.4fr] md:items-end">
          <div>
            <p id="verdict-direction" className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">
              Direction
            </p>
            <div role="radiogroup" aria-labelledby="verdict-direction" className="mt-1.5 flex gap-2">
              {(["long", "short"] as Direction[]).map((d) => {
                const on = direction === d;
                // Long and short are the two sentiments, and the only place
                // in Compose the sentiment colours are allowed to be chrome.
                const tone = d === "long" ? "var(--verdigris)" : "var(--rust)";
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onDirection(on ? null : d)}
                    className="num focus-ring rounded-[var(--radius-btn)] border px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors"
                    style={
                      on
                        ? { borderColor: tone, background: tone, color: "var(--paper)" }
                        : { borderColor: "var(--border)", color: "var(--text-mute)" }
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">Entry</p>
            <div className={cn(inputClass, "mt-1.5 bg-surface-2 text-text-mute")} aria-live="polite">
              {resolved?.priceLabel ?? (lookup.status === "checking" ? "…" : "Live at publish")}
            </div>
          </div>
          <div>
            <label htmlFor="verdict-target" className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">
              Target
            </label>
            <input
              id="verdict-target"
              value={target}
              onChange={(e) => onTarget(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              onKeyDown={(e) => {
                // The headline sits under the call: Enter moves there, not nowhere.
                if (e.key !== "Enter") return;
                e.preventDefault();
                document.getElementById("report-title")?.focus();
              }}
              className={cn(inputClass, "mt-1.5 border-[var(--ink)]")}
              placeholder="0.00"
            />
          </div>
          <div className="md:pb-1">
            {move != null ? (
              <p
                className="num text-[11px] uppercase tracking-[0.14em]"
                style={{ color: moveAgrees ? "var(--text)" : "var(--rust)" }}
              >
                {move >= 0 ? "+" : ""}
                {move.toFixed(1)}% from entry{direction ? ` · ${direction}` : ""}
              </p>
            ) : (
              <p className="num text-[11px] uppercase tracking-[0.14em] text-text-faint">
                Move from entry
              </p>
            )}
            {move != null && !moveAgrees ? (
              <p className="mt-1 font-display text-[0.9375rem] italic text-[var(--rust)]">
                The target moves against a {direction} call.
              </p>
            ) : null}
          </div>
        </div>

        <div className="my-4 border-t border-border" />

        {/* The horizon. */}
        <div className="flex items-baseline justify-between gap-3">
          <p className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">
            Horizon{" "}
            <span className="ml-2 text-[1rem] tracking-[0.08em] text-text">
              {horizon} days
            </span>
          </p>
          <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
            Resolves {resolvesLabel}
          </p>
        </div>
        <label htmlFor="verdict-horizon" className="sr-only">
          Horizon in days
        </label>
        <input
          id="verdict-horizon"
          type="range"
          min={VERDICT_HORIZON_MIN_DAYS}
          max={VERDICT_HORIZON_MAX_DAYS}
          step={1}
          value={clampHorizon(horizon)}
          onChange={(e) => onHorizon(clampHorizon(Number(e.target.value)))}
          className="mt-3 w-full accent-[var(--ink)]"
        />
        <div className="mt-1 flex justify-between">
          <span className="num text-[9px] uppercase tracking-[0.14em] text-text-faint">
            {VERDICT_HORIZON_MIN_DAYS} days min
          </span>
          <span className="num text-[9px] uppercase tracking-[0.14em] text-text-faint">
            {VERDICT_HORIZON_MAX_DAYS} days max
          </span>
        </div>
      </section>
    </div>
  );
}

/** What the block says under the ticker once it knows what was typed. */
function EligibilityLine({
  lookup,
  eligibility,
  onRetry,
}: {
  lookup: SymbolLookup;
  eligibility: VerdictEligibility | null;
  onRetry?: () => void;
}) {
  if (lookup.status === "idle") {
    return (
      <p className="t-meta mt-2 text-[11px] leading-snug">
        Equities only, under a $2B market cap. Gold, oil, yields and bitcoin are not eligible for a
        verdict.
      </p>
    );
  }
  if (lookup.status === "checking") {
    return (
      <p className="t-meta mt-2 text-[11px]" aria-live="polite">
        Checking {lookup.symbol}...
      </p>
    );
  }
  if (lookup.status === "missing") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--rust)]" role="alert">
        <X size={13} aria-hidden className="mt-px shrink-0" />
        <span>
          <span className="num font-semibold">{lookup.symbol}</span> was not found. Check the symbol.
        </span>
      </p>
    );
  }
  if (lookup.status === "failed") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--rust)]" role="alert">
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
  const e = eligibility ?? verdictEligibility(lookup.resolved);
  if (!e.ok) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-[var(--rust)]" role="alert">
        <X size={13} aria-hidden className="mt-px shrink-0" />
        <span>{e.reason}</span>
      </p>
    );
  }
  return (
    <p className="num mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--verdigris)]" aria-live="polite">
      <Check size={13} aria-hidden strokeWidth={2.2} />
      {e.line}
    </p>
  );
}
