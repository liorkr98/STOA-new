"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { listVersionsAction, restoreVersionAction } from "@/app/actions/reports";
import type { ReportVersion } from "@/lib/db/report-versions";

/**
 * Version history (Part E). A quiet floating control on the compose screen:
 * opens a panel of autosave snapshots; restoring snapshots the current state
 * first (undoable), overwrites the draft server-side, and refreshes so the
 * editor remounts with the restored content. Drafts only.
 */
export function VersionHistory({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ReportVersion[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    setError(null);
    if (next && versions === null) {
      start(async () => {
        setVersions(await listVersionsAction(reportId));
      });
    }
  }

  function restore(versionId: string) {
    setError(null);
    start(async () => {
      const res = await restoreVersionAction(reportId, versionId);
      if (!res.ok) {
        setError(res.error ?? "Restore failed");
        return;
      }
      setOpen(false);
      setVersions(null);
      setConfirmId(null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Version history"
        title="Version history"
        className="fixed bottom-5 left-5 z-40 flex h-10 w-10 items-center justify-center rounded-[var(--radius-btn)] border border-border bg-surface text-text-mute shadow-[var(--shadow-card)] transition-colors hover:text-text focus-ring"
      >
        <History size={17} />
      </button>

      {open && (
        <aside
          role="dialog"
          aria-label="Version history"
          className="menu-pop fixed bottom-[4.5rem] left-5 z-40 flex max-h-[60vh] w-72 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <History size={14} className="text-text-faint" />
            <span className="t-eyebrow flex-1">History</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="text-text-faint hover:text-text focus-ring"
            >
              <X size={15} />
            </button>
          </div>

          <div className="scroll-area flex-1 overflow-y-auto p-2">
            {versions === null ? (
              <p className="t-meta px-2 py-4 text-center text-[12px]">Loading...</p>
            ) : versions.length === 0 ? (
              <p className="t-meta px-2 py-4 text-center text-[12px]">
                No snapshots yet. Versions save automatically as you write.
              </p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="group flex items-center gap-2 rounded-[var(--radius-btn)] px-2 py-2 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{v.title || "Untitled"}</p>
                    <p className="num t-meta text-[11px]">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {confirmId === v.id ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => restore(v.id)}
                      className="rounded-[var(--radius-btn)] bg-accent px-2 py-1 text-[11px] font-semibold text-accent-ink focus-ring disabled:opacity-60"
                    >
                      {pending ? "..." : "Confirm"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Restore this version"
                      onClick={() => setConfirmId(v.id)}
                      className={cn(
                        "flex items-center gap-1 rounded-[var(--radius-btn)] px-2 py-1 text-[11px] text-text-mute opacity-0 transition-opacity hover:bg-bg focus-ring",
                        "group-hover:opacity-100 focus-visible:opacity-100",
                      )}
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                  )}
                </div>
              ))
            )}
            {error && <p className="px-2 py-1 text-[12px] text-[var(--down)]">{error}</p>}
          </div>

          <p className="t-meta border-t border-border px-3 py-2 text-[10px]">
            Restoring saves your current draft as a new snapshot first.
          </p>
        </aside>
      )}
    </>
  );
}
