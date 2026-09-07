"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * A publication whose clip exists but is not playing yet.
 *
 * Publishing locks the report first and uploads the clip second, because a
 * clip can only attach to a locked report. For a minute or a few after
 * publish the publication is therefore real and its video is not, and every
 * surface used to draw that as "no video": no player on the report page, a
 * written tile on the profile, a bare headline on Today. These two pieces
 * take the place the video will fill and say what is happening, roughly how
 * long, and that the reader can leave. Neither ever reads as "no video".
 */

export type PendingStatus = "processing" | "ready" | "failed";

function useElapsedMinutes(startedAt: string): number {
  const [minutes, setMinutes] = useState(() => Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 60_000)));
  useEffect(() => {
    const tick = () => setMinutes(Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 60_000)));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [startedAt]);
  return minutes;
}

/**
 * The report page: fills the player's own frame while the clip is on the way,
 * and asks the page to look again every so often, since the page is what
 * promotes a finished clip. A failed clip is shown only to its creator (the
 * page passes nothing for anyone else), with the way to attach it again.
 */
export function ClipPendingPlayer({
  status,
  startedAt,
  analystName,
  isAuthor,
}: {
  status: PendingStatus;
  startedAt: string;
  analystName: string;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const minutes = useElapsedMinutes(startedAt);
  const failed = status === "failed";

  useEffect(() => {
    if (failed) return;
    const id = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [failed, router]);

  return (
    <figure className="lg:mt-0">
      <div
        role="status"
        aria-live="polite"
        className="flex justify-center overflow-hidden rounded-[var(--radius-card)] border border-border bg-[var(--ink)] lg:mx-auto lg:w-fit"
      >
        <div className="relative mx-auto aspect-[9/16] w-[min(100%,18rem)] sm:h-[min(60vh,520px)] sm:w-auto lg:h-[min(50vh,440px)]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-[var(--paper)]">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border",
                failed ? "border-[var(--rust)] text-[var(--rust)]" : "border-[color-mix(in_srgb,var(--paper)_40%,transparent)]",
              )}
            >
              {failed ? <AlertTriangle size={18} strokeWidth={1.6} /> : <Loader2 size={18} strokeWidth={1.6} className="animate-spin" />}
            </span>
            <p className="num text-[10px] uppercase tracking-[0.2em] opacity-80">
              {failed ? "Video failed" : "Video processing"}
            </p>
            <p className="font-display text-[1.0625rem] font-semibold leading-snug">
              {failed ? "The video did not process." : `${analystName}'s video is being prepared.`}
            </p>
            <p className="max-w-[26ch] text-[0.8125rem] leading-relaxed opacity-80">
              {failed
                ? isAuthor
                  ? "Nothing reached readers. Attach the clip again from your publications."
                  : "The analyst has been told."
                : "Usually a few minutes. You can leave this page; it plays here when it is ready."}
            </p>
            {failed && isAuthor ? (
              <Link
                href="/studio"
                className="num focus-ring mt-1 rounded text-[10px] uppercase tracking-[0.16em] underline underline-offset-4"
              >
                Open publications
              </Link>
            ) : null}
            {!failed ? (
              <p className="num text-[10px] uppercase tracking-[0.14em] opacity-60">
                {minutes < 1 ? "Started under a minute ago" : `Started ${minutes} min ago`}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <figcaption className="num mt-2 text-[10px] uppercase tracking-[0.16em] text-text-faint">
        {failed ? "No video yet" : "Video on the way"}
      </figcaption>
    </figure>
  );
}

/**
 * Where a thumbnail would be, on Today and the profile: the frame is kept,
 * with a small spinner and the word, so a publication with a clip on the way
 * keeps its media area instead of collapsing to a written row.
 */
export function ClipPendingThumb({ className, label = true }: { className?: string; label?: boolean }) {
  return (
    <span
      aria-label="Video processing"
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--ink)] text-[var(--paper)]",
        className,
      )}
    >
      <Loader2 size={14} strokeWidth={1.6} className="animate-spin opacity-80" aria-hidden />
      {label ? <span className="num text-[9px] uppercase tracking-[0.16em] opacity-80">Processing</span> : null}
    </span>
  );
}
