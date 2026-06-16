"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import { topUp } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";

const AMOUNTS = [25, 50, 100];

export function TopUpButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function add(amount: number) {
    start(async () => {
      await topUp(amount);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} weight="bold" />
        Add credits
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {AMOUNTS.map((a) => (
        <Button key={a} variant="secondary" disabled={pending} onClick={() => add(a)}>
          +${a}
        </Button>
      ))}
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
