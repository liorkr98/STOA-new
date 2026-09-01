"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Pencil, Eye, Pin, Loader2, FileText, RotateCcw } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Direction } from "@/lib/types";
import { TickerChip, ThemeTag } from "@/components/ui/ticker-chip";
import { SealStamp } from "@/components/ui/seal-stamp";
import { setPinnedProfileReport } from "@/app/actions/profile";
import { PromoteDialog } from "@/components/compose/promote-dialog";
import { ArchiveDialog } from "@/components/studio/archive-dialog";
import { DeleteDialog } from "@/components/studio/delete-dialog";
import { EditedFlag } from "@/components/report/edited-flag";
import { restorePublication } from "@/app/actions/reports";
import { toast } from "sonner";

export type PubState = "draft" | "scheduled" | "published" | "open" | "resolved" | "archived";

export interface Publication {
  id: string;
  href: string;
  editHref: string;
  state: PubState;
  hasCall: boolean;
  /** Last edited after publication, if it ever was. */
  editedAt?: string | null;
  typeLabel: string;
  tag: string | null;
  tagIsTicker: boolean;
  badge: string;
  title: string;
  /** "3:42" when a ready clip exists; "" when there is no video. */
  duration: string;
  /** Real clip status; null when no video is attached. */
  videoStatus: "processing" | "ready" | "failed" | null;
  dateLabel: string;
  views: string;
  unlocks: string;
  revenue: string;
  pinned: boolean;
  // draft / scheduled
  stateLine: string | null;
  warning?: boolean;
  // open call
  entry?: string | null;
  target?: string | null;
  progressPct?: number | null;
  // resolved
  entryExit?: string | null;
  returnPct?: string | null;
  returnTone?: "up" | "down";
  sealStatus?: "hit" | "miss" | "near" | null;
  direction?: Direction | null;
}

const CHIPS: { key: "all" | PubState; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "draft", label: "DRAFTS" },
  { key: "archived", label: "ARCHIVED" },
  { key: "scheduled", label: "SCHEDULED" },
  { key: "published", label: "PUBLISHED" },
  { key: "open", label: "OPEN CALLS" },
  { key: "resolved", label: "RESOLVED" },
];

/**
 * The row's poster. A ready clip shows its duration; a processing clip shows
 * a quiet spinner and PROCESSING (the video is not playable yet, and says so);
 * no video shows a written-report glyph, not a fake play button.
 */
function Thumb({ duration, videoStatus }: { duration: string; videoStatus: Publication["videoStatus"] }) {
  return (
    <div className="relative h-16 w-11 flex-none overflow-hidden rounded-[8px] border border-border bg-surface-2">
      <div className="absolute inset-0 flex items-center justify-center">
        {videoStatus === "ready" ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)]">
            <Play size={10} className="ml-0.5 text-[var(--ink)]" fill="currentColor" />
          </span>
        ) : videoStatus === "processing" ? (
          <Loader2 size={14} className="animate-spin text-text-mute" aria-label="Video processing" />
        ) : videoStatus === "failed" ? (
          <span className="num text-[10px] uppercase tracking-[0.1em] text-[var(--rust)]">Failed</span>
        ) : (
          <FileText size={14} className="text-text-faint" aria-label="Written publication" />
        )}
      </div>
      {videoStatus === "ready" && duration ? (
        <span className="num absolute bottom-1 right-1 rounded bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] px-1 text-[10px] text-[var(--paper)]">
          {duration}
        </span>
      ) : null}
      {videoStatus === "processing" ? (
        <span className="num absolute inset-x-0 bottom-1 text-center text-[10px] uppercase tracking-[0.1em] text-text-mute">Processing</span>
      ) : null}
    </div>
  );
}

function PinAction({ id, pinned }: { id: string; pinned: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <button
      type="button"
      title="Pin to profile"
      onClick={() => start(async () => { await setPinnedProfileReport(id); router.refresh(); })}
      className={cn("flex items-center gap-1 hover:text-text", pinned ? "text-text" : "text-text-mute")}
    >
      <Pin size={14} fill={pinned ? "currentColor" : "none"} /> Pin
    </button>
  );
}

function RestoreAction({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await restorePublication(id);
          if (!res.ok) {
            toast.error(res.error ?? "Could not restore this publication.");
            return;
          }
          toast.success("Restored. It is public again.");
          router.refresh();
        })
      }
      className="flex items-center gap-1 hover:text-text"
    >
      <RotateCcw size={13} /> {pending ? "Restoring..." : "Restore"}
    </button>
  );
}

export function PublicationsView({ pubs }: { pubs: Publication[] }) {
  const [filter, setFilter] = useState<"all" | PubState>("all");
  const shown = useMemo(
    () => (filter === "all" ? pubs : pubs.filter((p) => p.state === filter)),
    [pubs, filter],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Publications</h1>
          <p className="t-body mt-2">Everything you&apos;ve made, and everything still open.</p>
        </div>
        <Link href="/studio/compose" className="rounded-[var(--radius-btn)] bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-[var(--paper)]">
          New publication
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={cn(
              "num shrink-0 rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
              filter === c.key
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-border text-text-mute hover:border-border-strong",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="t-meta">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-3 md:gap-0">
          {shown.map((p) => {
            const open = p.state === "open";
            const draft = p.state === "draft" || p.state === "scheduled";
            return (
              <div
                key={p.id}
                className={cn(
                  "group flex gap-4 rounded-[var(--radius-card)] p-5 md:rounded-none md:border-b md:border-border md:p-0 md:py-5",
                  open ? "border border-border bg-surface md:border md:bg-surface md:px-5" : "border border-border md:border-0",
                  open && p.warning && "border-l-2 border-l-[var(--brass)]",
                  draft && "opacity-70",
                )}
              >
                <Thumb duration={p.duration} videoStatus={p.videoStatus} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">{p.typeLabel}</span>
                    {p.tag && (p.tagIsTicker ? <TickerChip ticker={p.tag} /> : <ThemeTag label={p.tag} />)}
                    {p.badge ? (
                      <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{p.badge}</span>
                    ) : null}
                    {p.editedAt ? <EditedFlag editedAt={p.editedAt} /> : null}
                    {p.state === "archived" && (
                      <span className="num rounded-[var(--radius-tag)] bg-[var(--ink)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--paper)]">
                        Archived
                      </span>
                    )}
                    {p.pinned && (
                      <span className="num text-[10px] uppercase tracking-[0.14em] text-text">· PINNED TO PROFILE</span>
                    )}
                  </div>
                  <h3
                    className={cn(
                      "mt-2 font-display text-lg font-semibold leading-snug tracking-tight md:text-xl",
                      p.state === "archived" && "text-text-mute",
                    )}
                  >
                    <Link href={draft ? p.editHref : p.href}>{p.title}</Link>
                  </h3>

                  {p.stateLine && (
                    <p className={cn("num mt-2 text-[11px] uppercase tracking-[0.14em]", p.warning ? "text-[var(--brass)]" : "text-text-faint")}>
                      {p.stateLine}
                    </p>
                  )}

                  {open && (
                    <>
                      <p className="num mt-1.5 text-[11px] text-text-mute">
                        ENTRY {p.entry} · TARGET {p.target} · NOW — · —
                      </p>
                      <div className="mt-2 h-1 max-w-sm overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${p.progressPct ?? 0}%` }} />
                      </div>
                    </>
                  )}

                  {p.state === "resolved" && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="num text-[11px]" style={{ color: p.returnTone === "down" ? "var(--down)" : "var(--up)" }}>
                        {p.entryExit} · {p.returnPct}
                      </span>
                      <span className="num rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">
                        SCORE Δ pending
                      </span>
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="num mt-3 flex items-center gap-4 text-[11px] uppercase tracking-[0.12em] text-text-mute opacity-0 transition-opacity group-hover:opacity-100">
                    {/* Editing is no longer draft-only. A live publication can
                        be corrected, and the marker on it discloses that it
                        was. */}
                    <Link href={p.editHref} className="flex items-center gap-1 hover:text-text">
                      <Pencil size={13} /> Edit
                    </Link>
                    <Link href={p.href} className="flex items-center gap-1 hover:text-text"><Eye size={13} /> View</Link>
                    {p.state !== "archived" && <PinAction id={p.id} pinned={p.pinned} />}
                    {p.state !== "archived" && <PromoteDialog title={p.title} />}
                    {p.state === "archived" ? (
                      <RestoreAction id={p.id} />
                    ) : (
                      !draft && <ArchiveDialog id={p.id} title={p.title} hasCall={p.hasCall} />
                    )}
                    {/* Delete is offered only where it is allowed: a
                        publication carrying a call can be archived and
                        nothing else, so the option is absent rather than
                        present and refused. */}
                    {!draft && !p.hasCall && <DeleteDialog id={p.id} title={p.title} />}
                  </div>
                </div>

                <div className="hidden shrink-0 flex-col items-end gap-1 md:flex">
                  <div className="num text-right text-[11px] text-text-mute">{p.dateLabel}</div>
                  <div className="num mt-1 flex gap-4 text-[11px]">
                    <span className="text-text-mute">{p.views} <span className="text-text-faint">views</span></span>
                    <span className="text-text-mute">{p.unlocks} <span className="text-text-faint">unlocks</span></span>
                    <span className="text-text-mute">{p.revenue} <span className="text-text-faint">rev</span></span>
                  </div>
                </div>

                {p.sealStatus && (
                  <SealStamp status={p.sealStatus} date={new Date()} size="md" className="hidden shrink-0 md:block" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
