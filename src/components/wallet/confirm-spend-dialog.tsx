"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle, X } from "@phosphor-icons/react";
import { useEffect } from "react";
import { usd } from "@/lib/format";
import type { SpendResult } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * The single confirmation surface for any wallet spend. Per the Stoa rule, it
 * always shows cost, current balance, new balance, and the 90/10 split before
 * money moves.
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
  const reduce = useReducedMotion();
  const fee = Math.round(amount * 0.1 * 100) / 100;
  const toAnalyst = amount - fee;
  const newBalance = balance - amount;
  const insufficient = newBalance < 0;
  const done = result?.status && !result.error;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6"
            style={{ boxShadow: "var(--shadow-soft)" }}
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="t-h3">{title}</h2>
              <button onClick={onClose} className="text-text-faint hover:text-text" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle size={40} weight="fill" className="text-[var(--up)]" />
                <p className="font-semibold">You are all set</p>
                <p className="t-meta">New balance {usd(result!.new_balance ?? newBalance, { cents: true })}</p>
                <Button variant="secondary" className="mt-3" onClick={onClose}>
                  Done
                </Button>
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
                  <p className="mt-3 rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
                    Not enough balance. Top up your wallet to continue.
                  </p>
                )}
                {result?.error && (
                  <p className="mt-3 rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
                    {result.error}
                  </p>
                )}

                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
