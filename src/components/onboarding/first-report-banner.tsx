"use client";

import { useState } from "react";
import Link from "next/link";
import { X, LockSimple, Sparkle, ListChecks } from "@phosphor-icons/react";

/**
 * Step 4 (First report) of the creator onboarding wizard. Spec calls for
 * positional coach-marks anchored to specific editor fields; this is a
 * lighter-weight orientation banner instead -- the block editor is complex
 * enough that wiring anchored tooltips into it is real, separate scope, not
 * something to bolt on inside a broader rebrand pass.
 */
export function FirstReportBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mb-5 rounded-[var(--radius-card)] border border-accent/30 bg-accent-weak p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-h3">Your first report</p>
          <p className="t-body mt-1 text-sm">
            This is the real editor. Publishing locks in your first call for the Track Score, just
            like every report after it.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-text-faint hover:text-text"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <li className="flex items-start gap-2 text-sm text-text-mute">
          <LockSimple size={15} className="mt-0.5 shrink-0 text-accent" />
          A price target locks the moment you publish -- it can&apos;t be edited after.
        </li>
        <li className="flex items-start gap-2 text-sm text-text-mute">
          <Sparkle size={15} className="mt-0.5 shrink-0 text-accent" />
          Every claim runs through the AI fact-checker before you can lock it in.
        </li>
        <li className="flex items-start gap-2 text-sm text-text-mute">
          <ListChecks size={15} className="mt-0.5 shrink-0 text-accent" />
          The disclosure checklist is required -- investors always see it.
        </li>
      </ul>

      <Link href="/studio" className="t-meta mt-3 inline-block underline hover:no-underline">
        Skip tutorial, go to dashboard
      </Link>
    </div>
  );
}
