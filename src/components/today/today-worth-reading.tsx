import { HeadlineRow, RowTag } from "@/components/today/headline-row";
import { Band } from "@/components/ui/band";
import { accessLabel } from "@/lib/today/format";
import type { TodayItem } from "@/lib/today/types";

/**
 * Worth Reading. Global discovery, deliberately secondary to Your Desk:
 * analysts the reader has no relationship with yet, each row stating its price
 * up front so nothing here reads as a bait link.
 */
export function TodayWorthReading({ items }: { items: TodayItem[] }) {
  if (items.length === 0) return null;

  return (
    <Band title="Worth Reading" note="Beyond your desk." seeAllHref="/explore">
      <div className="mt-2">
        {items.map((item) => (
          <HeadlineRow
            key={item.reportId}
            item={item}
            tag={
              <RowTag tone={item.access === "free" ? "quiet" : "outline"}>
                {accessLabel(item.access, item.price)}
              </RowTag>
            }
          />
        ))}
      </div>
    </Band>
  );
}
