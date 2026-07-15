"use client";

import { useTransition } from "react";
import { markContactMessageStatus } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import type { ContactStatus } from "@/lib/db/contact";

export function ContactStatusButtons({
  id,
  status,
}: {
  id: string;
  status: ContactStatus;
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: ContactStatus) {
    startTransition(() => markContactMessageStatus(id, next));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "read" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("read")}
        >
          Mark read
        </Button>
      )}
      {status !== "archived" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("archived")}
        >
          Archive
        </Button>
      )}
      {status !== "new" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("new")}
        >
          Mark new
        </Button>
      )}
    </div>
  );
}
