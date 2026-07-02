"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/design/cn";
import { price } from "@/lib/format";
import { Button } from "./button";
import { SealStamp } from "./seal-stamp";

/**
 * The seal ritual. The one modal in the product confirming a genuinely
 * irreversible action, so it gets real focus-trap/restore behavior via
 * Radix rather than the hand-rolled Motion dialog used elsewhere (see
 * task to migrate the rest). Confirm is NOT default-focused -- a stray
 * Enter from habit must not lock something by accident.
 */
export function LockConfirmModal({
  open,
  onOpenChange,
  ticker,
  targetPrice,
  horizonDate,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
  /** null = no explicit target; the call locks at the live market entry price. */
  targetPrice: number | null;
  horizonDate: Date;
  onConfirm: () => void | Promise<void>;
}) {
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } catch {
      setPending(false);
      return;
    }
    setPending(false);
    setLocked(true);
    toast("Locked", {
      description: `${ticker} · ${targetPrice != null ? `$${price(targetPrice)}` : "market entry"}`,
      icon: <SealStamp status="locked" date={new Date()} size="sm" />,
    });
    window.setTimeout(() => onOpenChange(false), 1400);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setLocked(false);
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[fade-in_var(--dur-3)_var(--ease-out)] data-[state=closed]:animate-[fade-out_var(--dur-2)_var(--ease-out)]" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "ledger-card p-6 focus:outline-none",
            "data-[state=open]:animate-[modal-in_var(--dur-3)_var(--ease-out)]",
            "data-[state=closed]:animate-[modal-out_var(--dur-2)_var(--ease-out)]",
          )}
        >
          {!locked ? (
            <>
              <div className="flex items-start justify-between">
                <Dialog.Title className="t-h3">Lock this call in?</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="tap-target text-text-faint transition-colors hover:text-text focus-ring rounded-[var(--r-tag)]" aria-label="Close">
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>

              <Dialog.Description className="t-body mt-2">
                Once locked, this price target can&apos;t be edited or deleted. It&apos;ll count
                toward your MOAT score whether it hits or misses.
              </Dialog.Description>

              <dl className="mt-5 flex flex-col gap-2 rounded-[var(--r-card)] bg-surface-2 p-4 text-sm">
                <Row label="Ticker" value={ticker} />
                <Row
                  label="Target"
                  value={targetPrice != null ? `$${price(targetPrice)}` : "Locks at market entry"}
                />
                <Row label="Horizon" value={horizonDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
              </dl>

              <div className="mt-6 flex gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost" className="flex-1" autoFocus>
                    Go back and edit
                  </Button>
                </Dialog.Close>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={pending}
                  onClick={handleConfirm}
                >
                  {pending ? "Locking..." : "Lock it in"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <SealStamp status="locked" date={new Date()} size="lg" animate />
              <div>
                <p className="t-h3">Locked</p>
                <p className="t-meta mt-1">
                  {ticker} &middot; {targetPrice != null ? `$${price(targetPrice)}` : "market entry"} &middot; can&apos;t be edited
                </p>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="t-meta">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}
