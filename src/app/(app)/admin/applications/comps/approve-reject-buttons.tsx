"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { approveAnalystApplication, rejectAnalystApplication } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

export function ApproveRejectButtons({ applicationId }: { applicationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [rejectMode, setRejectMode] = useState(false);
  const [note, setNote] = useState("");

  function handleApprove() {
    startTransition(() => approveAnalystApplication(applicationId));
  }

  function handleReject() {
    startTransition(() => rejectAnalystApplication(applicationId, note || undefined));
  }

  if (rejectMode) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          className="w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm resize-none"
          rows={2}
          placeholder="Optional note to the applicant…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={handleReject}
        className="bg-[var(--rust)] text-[var(--accent-ink)] hover:brightness-[1.06]"
      >
        <XCircle size={15} weight="fill" />
        Confirm reject
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => setRejectMode(false)}
      >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={handleApprove}
      >
        <CheckCircle size={15} weight="fill" />
        Approve
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => setRejectMode(true)}
        className="text-[var(--rust)] border-[color-mix(in_srgb,var(--rust)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--rust)_10%,transparent)]"
      >
        <XCircle size={15} weight="fill" />
        Reject
      </Button>
    </div>
  );
}
