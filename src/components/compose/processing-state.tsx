"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * What the creator sees after hitting publish while the video is still
 * processing: the publication exists; the video is being transcoded and
 * captioned by the video host, and (once a burn-in pipeline exists) overlays
 * are being composited. It reads as progress, not a hang: what is happening,
 * roughly how long, and that they can leave. The status is the clip's real
 * status; nothing here pretends to complete.
 */
export type ProcessingStatus = "processing" | "ready" | "failed";

const STEPS = [
  { key: "upload", label: "Upload received" },
  { key: "transcode", label: "Transcoding for every screen" },
  { key: "captions", label: "Generating captions" },
  { key: "ready", label: "Ready to watch" },
] as const;

export function ProcessingState({
  status,
  startedAt,
  reportHref,
  hasOverlays,
  compact = false,
}: {
  status: ProcessingStatus;
  startedAt: string;
  reportHref: string;
  hasOverlays: boolean;
  compact?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, (Date.now() - Date.parse(startedAt)) / 1000));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [startedAt]);

  const doneUpTo = status === "ready" ? 4 : status === "failed" ? 1 : elapsed < 60 ? 2 : 3;
  const minutes = Math.floor(elapsed / 60);

  return (
    <section
      aria-live="polite"
      className={cn("rounded-[var(--radius-card)] border border-border bg-surface", compact ? "p-4" : "p-5 md:p-6")}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="t-eyebrow">{status === "ready" ? "Published" : status === "failed" ? "Video failed" : "Publishing"}</p>
          <h3 className="mt-1 font-display text-[1.25rem] font-semibold tracking-tight">
            {status === "ready"
              ? "Your publication is live."
              : status === "failed"
                ? "The video did not process."
                : "Your publication exists. The video is still processing."}
          </h3>
          <p className="mt-1.5 max-w-[52ch] text-[0.875rem] text-text-mute">
            {status === "processing"
              ? `Usually a few minutes for a 90-second clip${hasOverlays ? "; overlays add a compositing pass once that pipeline exists" : ""}. You can leave this page; the video appears on your publication when it is ready.`
              : status === "ready"
                ? "The video is transcoded, captioned and playing on the report page."
                : "Nothing was published to readers. Try the upload again from the publication."}
          </p>
        </div>
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
          {status === "processing" ? (minutes < 1 ? "Started under a minute ago" : `Started ${minutes} min ago`) : null}
        </span>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = i < doneUpTo;
          const active = i === doneUpTo && status === "processing";
          const failed = status === "failed" && i === 1;
          return (
            <li key={s.key} className="flex items-center gap-2 border-t border-border pt-2">
              <span
                className={cn(
                  "flex h-5 w-5 flex-none items-center justify-center rounded-full border",
                  done && "border-[var(--verdigris)] text-[var(--verdigris)]",
                  active && "border-[var(--ink)] text-[var(--ink)]",
                  failed && "border-[var(--rust)] text-[var(--rust)]",
                  !done && !active && !failed && "border-border text-text-faint",
                )}
              >
                {done ? <Check size={11} strokeWidth={2.2} /> : failed ? <AlertTriangle size={11} /> : active ? <Loader2 size={11} className="animate-spin" /> : null}
              </span>
              <span className={cn("text-[12px]", done || active ? "text-text" : "text-text-faint")}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {!compact ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href={reportHref} className="num text-[11px] uppercase tracking-[0.14em] text-text underline underline-offset-4 focus-ring rounded">
            Open the publication →
          </Link>
          <Link href="/studio" className="num text-[11px] uppercase tracking-[0.14em] text-text-mute hover:text-text focus-ring rounded">
            Back to publications
          </Link>
        </div>
      ) : null}
    </section>
  );
}
