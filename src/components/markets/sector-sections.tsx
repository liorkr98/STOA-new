import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Band } from "@/components/ui/band";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DayChange } from "@/components/markets/day-change";
import { FollowSector, FollowTicker } from "@/components/markets/follow-control";
import { FollowButton } from "@/components/follow-button";
import { HeadlineRow, RowTag } from "@/components/today/headline-row";
import { accessLabel } from "@/lib/today/format";
import { price } from "@/lib/format";
import type { SectorAnalyst, SectorName, SectorPayload } from "@/lib/markets/build-sector";

export function SectorHeader({ payload }: { payload: SectorPayload }) {
  return (
    <header>
      <Link href="/markets" className="markets-crumb focus-ring">
        <span aria-hidden>←</span> Markets
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="stock-name">{payload.sector}</h1>
          <p className="stock-sub">Sector</p>
        </div>

        <div className="flex items-end gap-4">
          {/* No sector index series exists, so the level stays reserved. The
              change is the equal-weight average of the listed names' day
              changes, and says so. */}
          <span className="stock-price">
            <span className="markets-pending">No index level</span>
          </span>
          <span title="Equal-weight average day change of the names below">
            <DayChange percent={payload.dayChangeEqualWeight} size="lg" />
          </span>
          <FollowSector sector={payload.sector} className="mb-1" />
        </div>
      </div>

      <div className="stock-meta">
        <span className="stock-meta-item">
          <span className="stock-meta-key">Names covered</span>
          <span className="num">{payload.namesCovered}</span>
        </span>
        <span className="stock-meta-item">
          <span className="stock-meta-key">Analysts active</span>
          <span className="num">{payload.analystsActive}</span>
        </span>
        <span className="stock-meta-item">
          <span className="stock-meta-key">Publications this week</span>
          <span className="num">{payload.publicationsThisWeek}</span>
        </span>
      </div>
    </header>
  );
}

/**
 * Performance needs a sector index series and an S&P series to compare it
 * against. Neither exists: the platform has no sector index, so the section
 * shows its structure and says what is missing rather than drawing a line that
 * would look like a measurement.
 */
export function SectorPerformance({ sector }: { sector: string }) {
  return (
    <Band title="Performance" note={`${sector} against the S&P 500.`}>
      <div className="sector-perf">
        <p className="markets-pending">No sector index series available</p>
      </div>
      <p className="markets-gap-note">
        A sector index has to be built from a history of constituent prices; the quote path
        carries today&apos;s levels and day changes only. Nothing is drawn until a series exists.
      </p>
    </Band>
  );
}

export function SectorNames({ names }: { names: SectorName[] }) {
  if (names.length === 0) return null;

  return (
    <Band title="The names" note="What sits inside this sector.">
      <div className="mt-2">
        {names.map((n) => (
          <div key={n.symbol} className="markets-row">
            <Link href={`/markets/${n.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={n.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{n.company}</span>
            </Link>
            <span className="num tabular-nums text-text">
              {n.price == null ? <span className="markets-pending">No price</span> : price(n.price)}
            </span>
            <DayChange percent={n.changePercent} />
            <span className="markets-row-meta num">
              {n.publications} {n.publications === 1 ? "publication" : "publications"}
              {n.openCalls > 0
                ? ` · ${n.openCalls} open ${n.openCalls === 1 ? "call" : "calls"}`
                : ""}
            </span>
            <FollowTicker ticker={n.symbol} />
          </div>
        ))}
      </div>
    </Band>
  );
}

/**
 * Coverage volume and the outcome record for the sector. There is deliberately
 * no long/short split here: a sector-wide stance would read as a Stoa house
 * view, and Stoa does not have one.
 */
export function SectorCoverage({ payload }: { payload: SectorPayload }) {
  if (payload.openCalls === 0 && payload.resolvedCount === 0) return null;

  return (
    <Band
      title={`Stoa coverage of ${payload.sector}`}
      note="How much of Stoa is publishing here. Volume only, never a house view."
    >
      <div className="stock-consensus">
        <div>
          <p className="stock-consensus-figure">{payload.openCalls}</p>
          <p className="stock-consensus-key">
            Open {payload.openCalls === 1 ? "call" : "calls"}
          </p>
        </div>
        <div>
          <p className="stock-consensus-figure">{payload.analystsActive}</p>
          <p className="stock-consensus-key">
            {payload.analystsActive === 1 ? "Analyst active" : "Analysts active"}
          </p>
        </div>
        <div>
          <p className="stock-consensus-figure">{payload.publicationsThisWeek}</p>
          <p className="stock-consensus-key">Publications this week</p>
        </div>
        <div>
          <p className="stock-consensus-figure">{payload.resolvedCount}</p>
          <p className="stock-consensus-key">Resolved {payload.resolvedCount === 1 ? "call" : "calls"}</p>
        </div>
      </div>
    </Band>
  );
}

export function SectorPublications({
  sector,
  items,
}: {
  sector: string;
  items: import("@/lib/today/types").TodayItem[];
}) {
  if (items.length === 0) return null;

  return (
    <Band
      title="Publications in this sector"
      note="Calls on names here, and commentary tagged to the sector itself."
      seeAllHref="/explore"
    >
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
      <p className="markets-gap-note">
        Commentary carrying no ticker is tagged to {sector}; the content model has no per-report
        theme field yet, so the sector page is the only surface that can tag it.
      </p>
    </Band>
  );
}

export function SectorAnalysts({
  analysts,
  isAuthed,
}: {
  analysts: SectorAnalyst[];
  isAuthed: boolean;
}) {
  if (analysts.length === 0) return null;

  return (
    <Band title="Analysts covering this sector" note="Who publishes here most.">
      <div className="mt-2">
        {analysts.map((a) => (
          <div key={a.handle} className="markets-row">
            <Link href={`/analyst/${a.handle}`} className="markets-row-name focus-ring">
              <Avatar src={a.avatarUrl} name={a.displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                {a.displayName}
              </span>
            </Link>
            <span className="markets-row-meta num">
              {a.calls} {a.calls === 1 ? "call" : "calls"}
            </span>
            <FollowButton analystId={a.id} initialFollowing={a.following} isAuthed={isAuthed} />
          </div>
        ))}
      </div>
    </Band>
  );
}
