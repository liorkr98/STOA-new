import { PencilLine } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * The EDITED marker as it appears in a list.
 *
 * The full panel of what changed lives on the publication itself; a card in a
 * feed has neither the room for it nor a reader who asked. So this is the same
 * mark without the popover: it says the publication was revised and when, and
 * opening the publication says what moved.
 */
export function EditedFlag({
  editedAt,
  className,
}: {
  editedAt: string;
  className?: string;
}) {
  const when = new Date(editedAt);
  return (
    <span
      title={`Edited ${when.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}. Open the publication to see what changed.`}
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--brass)]/50 bg-[var(--brass)]/10 px-1.5 py-0.5",
        className,
      )}
    >
      <PencilLine size={10} aria-hidden />
      <span className="num text-[10px] uppercase tracking-[0.14em]">Edited</span>
    </span>
  );
}
