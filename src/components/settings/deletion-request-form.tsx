"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { requestAccountDeletion } from "@/app/actions/account";

export function DeletionRequestForm() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      const res = await requestAccountDeletion();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setMessage(
        "Request received. An admin will review it. Locked calls stay on the public record under a deleted handle; your name and email will be removed.",
      );
    });
  }

  if (message) {
    return <p className="t-body text-text-mute">{message}</p>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" disabled={pending} onClick={submit} className={buttonClass("ghost", "sm")}>
        Request deletion
      </button>
      {error ? (
        <p className="text-xs text-[var(--down)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
