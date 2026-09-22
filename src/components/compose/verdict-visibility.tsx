"use client";

import { Lock } from "lucide-react";

/**
 * Who sees a verdict, stated on the publish screen where it cannot be missed.
 *
 * The rule is the whole mechanic: subscribers-only while the call is open,
 * public the moment the market resolves it. Two halves of that are not
 * built on the server yet, and the second line says so in one breath rather
 * than pretending: the call itself is readable by anyone, and nothing flips
 * the piece public at resolution. It still saves and publishes correctly as
 * subscribers-only.
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
        moment the market resolves it.
      </p>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--brass)]">
        Today the call itself (ticker, direction, target) is readable by anyone, and the piece
        stays subscribers-only after it resolves until the server flip is built.
      </p>
    </section>
  );
}
