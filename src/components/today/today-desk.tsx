import { HeadlineRow, RowTag } from "@/components/today/headline-row";
import { TodayBand, TodayColumnHead } from "@/components/today/today-band";
import type { TodayItem } from "@/lib/today/types";

/**
 * Your Desk. Two equal columns under one band header: what the reader pays
 * for, and who the reader follows. They are peers by construction -- same
 * width, same header weight, a column rule and no ranking between them.
 */
export function TodayDesk({
  subscriptions,
  following,
}: {
  subscriptions: TodayItem[];
  following: TodayItem[];
}) {
  if (subscriptions.length === 0 && following.length === 0) return null;

  return (
    <TodayBand
      title="Your Desk"
      note="Fresh from the people you pay for and the people you follow."
    >
      <div className="today-desk mt-5">
        <DeskColumn
          title="New from your subscriptions"
          seeAllHref="/subscriptions"
          items={subscriptions}
          tag="Subscribed"
          tone="solid"
          empty="No new work from your subscriptions today."
        />
        <DeskColumn
          title="From analysts you follow"
          seeAllHref="/following"
          items={following}
          tag="Following"
          tone="quiet"
          empty="No new work from the analysts you follow today."
        />
      </div>
    </TodayBand>
  );
}

function DeskColumn({
  title,
  seeAllHref,
  items,
  tag,
  tone,
  empty,
}: {
  title: string;
  seeAllHref: string;
  items: TodayItem[];
  tag: string;
  tone: "solid" | "quiet";
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <TodayColumnHead title={title} seeAllHref={seeAllHref} />
      {items.length === 0 ? (
        <p className="py-6 text-sm text-text-mute">{empty}</p>
      ) : (
        items.map((item) => (
          <HeadlineRow
            key={item.reportId}
            item={item}
            tag={<RowTag tone={tone}>{tag}</RowTag>}
          />
        ))
      )}
    </div>
  );
}
