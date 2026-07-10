"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { topUp } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";

const AMOUNTS = [25, 50, 100];

export function TopUpButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add(amount: number) {
    setError(null);
    start(async () => {
      const res = await topUp(amount);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(`Added $${amount} to your balance`);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden />
        Add funds
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
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
      {error && (
        <p className="text-xs text-[var(--down)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
