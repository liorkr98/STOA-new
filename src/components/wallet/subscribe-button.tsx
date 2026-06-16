"use client";

import Link from "next/link";
import { useState } from "react";
import { useSubscribe } from "@/hooks/use-spend";
import { Button, buttonClass } from "@/components/ui/button";
import { usd } from "@/lib/format";
import { ConfirmSpendDialog } from "./confirm-spend-dialog";

export function SubscribeButton({
  analystId,
  handle,
  price,
  balance,
  isAuthed,
  subscribed,
}: {
  analystId: string;
  handle: string;
  price: number | null;
  balance: number;
  isAuthed: boolean;
  subscribed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useSubscribe(analystId, handle);

  if (!isAuthed) {
    return (
      <Link href="/sign-in" className={buttonClass("primary", "lg", "w-full")}>
        Sign in to subscribe
      </Link>
    );
  }
  if (subscribed) {
    return (
      <Button variant="secondary" size="lg" className="w-full" disabled>
        Subscribed
      </Button>
    );
  }
  if (!price) {
    return (
      <Button variant="secondary" size="lg" className="w-full" disabled>
        Not accepting subscribers
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        Subscribe · {usd(price)}/mo
      </Button>
      <ConfirmSpendDialog
        open={open}
        onClose={() => {
          setOpen(false);
          mutation.reset();
        }}
        title={`Subscribe to @${handle}`}
        amount={price}
        balance={balance}
        confirmLabel="Confirm subscription"
        pending={mutation.isPending}
        result={mutation.data}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
