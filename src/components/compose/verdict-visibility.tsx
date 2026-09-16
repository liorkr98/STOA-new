"use client";

import { Lock } from "lucide-react";

/**
 * Who sees a verdict, stated on the publish screen where it cannot be missed.
 *
 * The rule is the whole mechanic: subscribers-only while the call is open,
 * public the moment the market resolves it. Two halves of that are not
 * built on the server yet, and this says so rather than pretending:
 * the written text is gated today, the call itself is not, and nothing
 * flips it public at resolution. The publication still saves and
 * publishes correctly as subscribers-only.
 */
export function VerdictVisibility() {
  return (
    <section className="ledger-card p-4" aria-label="Visibility">
      <div className="flex items-center justify-between gap-3">
        <p className="t-eyebrow">Visibility</p>
        <span className="num flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-text-mute">
          <Lock size={12} aria-hidden />
          Fixed for a verdict
        </span>
      </div>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-text">
        <span className="font-medium">Subscribers only while the call is open.</span> Public the
        moment the market resolves it, so the record speaks for you anywhere.
      </p>
      <div className="mt-3 rounded-[var(--radius-btn)] border border-[var(--brass)]/50 bg-[var(--brass)]/10 p-3">
        <p className="num text-[10px] uppercase tracking-[0.16em] text-[var(--brass)]">
          What the site does today
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-text">
          This publishes as subscribers-only and the written text is gated to them. The call
          itself (ticker, direction, target) is visible to anyone who opens the publication, and
          nothing yet makes the whole thing public when it resolves. Both are being built on the
          server; until then this stays subscribers-only after resolution unless you change it.
        </p>
      </div>
    </section>
  );
}
