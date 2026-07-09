"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { usd } from "@/lib/format";
import type { SpendResult } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * The single confirmation surface for any wallet spend. Per the Stoa rule, it
 * always shows cost, current balance, new balance, and the 90/10 split before
 * money moves. Built on Radix Dialog for real focus-trap/restore/Escape
 * behavior, matching LockConfirmModal and DebateThread. Bottom sheet on
 * mobile, centered dialog on desktop (sm+) -- same dual-axis technique as
 * DebateThread's sheet-in-y/modal-in split.
 */
export function ConfirmSpendDialog({
  open,
  onClose,
  title,
  amount,
  balance,
  confirmLabel,
  pending,
  result,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  balance: number;
  confirmLabel: string;
  pending: boolean;
  result?: SpendResult;
  onConfirm: () => void;
}) {
  const fee = Math.round(amount * 0.1 * 100) / 100;
  const toAnalyst = amount - fee;
  const newBalance = balance - amount;
  const insufficient = newBalance < 0;
  const done = result?.status && !result.error;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[fade-in_var(--dur-3)_var(--ease-out)] data-[state=closed]:animate-[fade-out_var(--dur-2)_var(--ease-out)]" />
        <Dialog.Content
          className={cn(
            "fixed z-50 w-full border-border bg-surface p-6 focus:outline-none",
            "inset-x-0 bottom-0 rounded-t-[var(--radius-card)] border-t",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-card)] sm:border",
            "data-[state=open]:animate-[sheet-in-y_var(--dur-3)_var(--ease-drawer)]",
            "data-[state=closed]:animate-[sheet-out-y_var(--dur-2)_var(--ease-out)]",
            "sm:data-[state=open]:animate-[modal-in_var(--dur-3)_var(--ease-out)]",
            "sm:data-[state=closed]:animate-[modal-out_var(--dur-2)_var(--ease-out)]",
          )}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start justify-between">
            <Dialog.Title className="t-h3">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="tap-target text-text-faint transition-colors hover:text-text focus-ring rounded-[var(--r-tag)]" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Confirm this wallet spend before it processes.
          </Dialog.Description>

          {done ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 size={40} className="text-[var(--up)]" aria-hidden />
              <p className="font-semibold">You are all set</p>
              <p className="t-meta">New balance {usd(result!.new_balance ?? newBalance, { cents: true })}</p>
              <Dialog.Close asChild>
                <Button variant="secondary" className="mt-3">
                  Done
                </Button>
              </Dialog.Close>
            </div>
          ) : (
            <>
              <dl className="mt-5 flex flex-col gap-2.5 text-sm">
                <Row label="Cost" value={usd(amount, { cents: true })} strong />
                <Row label="To the analyst (90%)" value={usd(toAnalyst, { cents: true })} />
                <Row label="Platform fee (10%)" value={usd(fee, { cents: true })} />
                <div className="my-1 h-px bg-border" />
                <Row label="Current balance" value={usd(balance, { cents: true })} />
                <Row
                  label="New balance"
                  value={usd(newBalance, { cents: true })}
                  strong
                  tone={insufficient ? "down" : undefined}
                />
              </dl>

              {insufficient && (
                <div className="mt-3 rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
                  <p>Not enough balance. Top up your wallet to continue.</p>
                  <Link
                    href="/wallet"
                    className="mt-1 inline-block font-medium underline hover:no-underline"
                  >
                    Go to wallet
                  </Link>
                </div>
              )}
              {result?.error && (
                <p className="mt-3 rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
                  {result.error}
                </p>
              )}

              <div className="mt-5 flex gap-3">
                <Dialog.Close asChild>
                  <Button variant="secondary" className="flex-1">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  className="flex-1"
                  disabled={pending || insufficient}
                  onClick={onConfirm}
                >
                  {pending ? "Processing..." : confirmLabel}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "down";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-mute">{label}</dt>
      <dd
        className={`num ${strong ? "font-semibold" : ""} ${
          tone === "down" ? "text-[var(--down)]" : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
