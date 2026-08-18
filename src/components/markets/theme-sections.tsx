import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Band } from "@/components/ui/band";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DayChange } from "@/components/markets/day-change";
import { FollowTicker } from "@/components/markets/follow-control";
import { FollowButton } from "@/components/follow-button";
import { HeadlineRow, RowTag } from "@/components/today/headline-row";
import { accessLabel } from "@/lib/today/format";
import { price } from "@/lib/format";
import type { ThemePayload } from "@/lib/markets/build-theme";

/**
 * The theme page, structured like the sector page: constituent names with
 * prices, publications about the theme, the analysts most active in it, and
 * a short editorial paragraph explaining what the theme is. Coverage counts
 * and momentum only; no stance aggregate.
 */
export function ThemeHeader({ payload }: { payload: ThemePayload }) {
  const { theme } = payload;
  const up = payload.publicationsThisWeek > payload.publicationsLastWeek;
  const down = payload.publicationsThisWeek < payload.publicationsLastWeek;
  return (
    <header>
      <Link href="/markets" className="markets-crumb focus-ring">
        <span aria-hidden>←</span> Markets
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="stock-name">{theme.name}</h1>
          <p className="stock-sub">Theme</p>
        </div>
      </div>
      <p className="mt-5 max-w-[62ch] font-display text-[1.0625rem] leading-relaxed text-text-mute">{theme.about}</p>
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
          <span className="num">
            {payload.publicationsThisWeek}
            <span className={up ? "text-text" : "text-text-faint"} title="This week against last">
              {" "}
              {up ? "▲" : down ? "▼" : "="} {payload.publicationsLastWeek} last week
            </span>
          </span>
        </span>
      </div>
    </header>
  );
}

export function ThemeNames({ payload }: { payload: ThemePayload }) {
  if (payload.names.length === 0) return null;
  return (
    <Band title="The names" note="What the theme is made of.">
      <div className="mt-2">
        {payload.names.map((n) => (
          <div key={n.symbol} className="markets-row">
            <Link href={`/markets/${n.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={n.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{n.company}</span>
            </Link>
            <span className="num text-sm text-text">{n.price == null ? <span className="markets-pending">&ndash;&ndash;</span> : price(n.price)}</span>
            <DayChange percent={n.changePercent} />
            <span className="markets-row-meta num">
              {n.publications} {n.publications === 1 ? "publication" : "publications"}
            </span>
            <FollowTicker ticker={n.symbol} />
          </div>
        ))}
      </div>
    </Band>
  );
}

export function ThemePublications({ payload }: { payload: ThemePayload }) {
  if (payload.publications.length === 0) return null;
  return (
    <Band title="Publications about this theme" note="Calls on its names, and commentary on them with no call.">
      <div className="mt-2">
        {payload.publications.map((item) => (
          <HeadlineRow
            key={item.reportId}
            item={item}
            tag={<RowTag tone={item.access === "free" ? "quiet" : "outline"}>{accessLabel(item.access, item.price)}</RowTag>}
          />
        ))}
      </div>
    </Band>
  );
}

export function ThemeAnalysts({ payload, isAuthed }: { payload: ThemePayload; isAuthed: boolean }) {
  if (payload.analysts.length === 0) return null;
  return (
    <Band title="Most active in this theme" note="Who publishes here most. No ranking, no score.">
      <div className="mt-2">
        {payload.analysts.map((a) => (
          <div key={a.handle} className="markets-row">
            <Link href={`/analyst/${a.handle}`} className="markets-row-name focus-ring">
              <Avatar src={a.avatarUrl} name={a.displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{a.displayName}</span>
            </Link>
            <span className="markets-row-meta num">
              {a.publications} {a.publications === 1 ? "publication" : "publications"}
            </span>
            <FollowButton analystId={a.id} initialFollowing={a.following} isAuthed={isAuthed} />
          </div>
        ))}
      </div>
    </Band>
  );
}
