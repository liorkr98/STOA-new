"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { restorePublication } from "@/app/actions/reports";

/**
 * Shown on an archived publication so its state is never ambiguous. An archived
 * publication is otherwise indistinguishable from a live one, which is exactly
 * the mistake worth preventing: the author needs to know nobody else can see
 * this, and that it is one action away from being public again.
 */
export function ArchivedBanner({ reportId, isAuthor }: { reportId: string; isAuthor: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-card)] border border-border bg-surface-2 px-4 py-3">
      <span className="num flex items-center gap-1.5 rounded-[var(--radius-tag)] bg-[var(--ink)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--paper)]">
        <Archive size={12} strokeWidth={1.8} /> Archived
      </span>
      <p className="min-w-0 flex-1 text-[0.8125rem] text-text-mute">
        {isAuthor
          ? "Hidden from the public. Only you can see this page."
          : "This publication has been archived by its author."}
      </p>
      {isAuthor ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await restorePublication(reportId);
              if (!res.ok) {
                toast.error(res.error ?? "Could not restore this publication.");
                return;
              }
              toast.success("Restored. It is public again.");
              router.refresh();
            })
          }
          className="focus-ring num shrink-0 rounded-[var(--radius-btn)] border border-[var(--ink)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-text transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:opacity-50"
        >
          {pending ? "Restoring..." : "Restore"}
        </button>
      ) : null}
    </div>
  );
}
