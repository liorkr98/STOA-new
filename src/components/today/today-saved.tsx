import { HeadlineRow, RowTag } from "@/components/today/headline-row";
import { Band } from "@/components/ui/band";
import type { TodaySavedItem, TodaySavedReason } from "@/lib/today/types";

const REASON_LABEL: Record<TodaySavedReason, string> = {
  resolved_hit: "Resolved · Hit",
  resolved_miss: "Resolved · Miss",
  follow_up: "Analyst published a follow-up",
  unread: "Still unread",
};

/**
 * From Your Saved. Appears only when something the reader saved has actually
 * changed, so the band is never a second, staler copy of their library. Each
 * row states its own reason for resurfacing.
 */
export function TodaySaved({ items }: { items: TodaySavedItem[] }) {
  if (items.length === 0) return null;

  return (
    <Band
      title="From Your Saved"
      note="Things you saved, with news."
      seeAllHref="/saved"
      seeAllLabel="See all saved"
    >
      <div className="mt-2">
        {items.map((item) => (
          <HeadlineRow
            key={item.reportId}
            item={item}
            tag={<RowTag tone="outline">{REASON_LABEL[item.reason]}</RowTag>}
          />
        ))}
      </div>
    </Band>
  );
}
