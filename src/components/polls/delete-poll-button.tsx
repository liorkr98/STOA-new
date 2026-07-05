"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePollAction } from "@/app/actions/polls";

/** Creator-only poll delete, overlaid on the card corner in the studio list. */
export function DeletePollButton({ pollId }: { pollId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Delete poll"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePollAction(pollId);
          router.refresh();
        })
      }
      className="tap-target absolute right-3 top-3 text-text-faint transition-colors hover:text-[var(--down)] focus-ring disabled:opacity-50"
    >
      <Trash2 size={14} />
    </button>
  );
}
