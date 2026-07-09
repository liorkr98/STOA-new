"use client";

import Link from "next/link";
import { useState } from "react";
import { LockOpen } from "lucide-react";
import { usePurchaseReport } from "@/hooks/use-spend";
import { Button, buttonClass } from "@/components/ui/button";
import { usd } from "@/lib/format";
import { ConfirmSpendDialog } from "./confirm-spend-dialog";

export function BuyReportButton({
  reportId,
  price,
  balance,
  isAuthed,
  authorHandle,
}: {
  reportId: string;
  price: number;
  balance: number;
  isAuthed: boolean;
  authorHandle: string;
}) {
  const [open, setOpen] = useState(false);
  const mutation = usePurchaseReport(reportId);

  if (!isAuthed) {
    return (
      <Link href="/sign-in" className={buttonClass("secondary", "lg", "w-full")}>
        Sign in to unlock
      </Link>
    );
  }

  return (
    <>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <LockOpen size={18} aria-hidden />
        Unlock for {usd(price)}
      </Button>
      <ConfirmSpendDialog
        open={open}
        onClose={() => {
          setOpen(false);
          mutation.reset();
        }}
        title={`Unlock this report from @${authorHandle}`}
        amount={price}
        balance={balance}
        confirmLabel="Confirm purchase"
        pending={mutation.isPending}
        result={mutation.data}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
