import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Band } from "@/components/ui/band";
import { ScoreRing } from "@/components/ui/score-ring";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DirectionTag } from "@/components/ui/tag";
import { DayChange } from "@/components/markets/day-change";
import { FollowSector, FollowTicker } from "@/components/markets/follow-control";
import { sinceLabel } from "@/lib/today/format";
import { compact, price } from "@/lib/format";
import type {
  CallLean,
  EtfBandRow,
  CoveredRow,
  MarketRow,
  NewlyCalledRow,
  SectorTile,
  TapeQuote,
  ThemeCard,
} from "@/lib/markets/types";

function Px({ value }: { value: number | null }) {
  if (value == null) return <span className="markets-pending">No price</span>;
  return <span className="num tabular-nums">{price(value)}</span>;
}

/* ---------------------------------------------------------------- tape --- */

export function MarketTape({ quotes }: { quotes: TapeQuote[] }) {
  return (
    <div className="markets-tape scroll-area" aria-label="Market tape">
      {quotes.map((q) => (
        <span key={q.symbol} className="markets-tape-item">
          <span className="markets-tape-label">{q.label}</span>
          {/* DAY-CHANGE-PENDING: index and commodity levels are not carried by
              the instrument table, so the value is reserved alongside it. */}
          <span className="num tabular-nums text-text">
            {q.value == null ? <span className="markets-pending">&ndash;&ndash;</span> : price(q.value)}
          </span>
          <DayChange percent={q.changePercent} />
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- themes --- */

export function ExploreThemes({ themes }: { themes: ThemeCard[] }) {
  if (themes.length === 0) return null;
  return (
    <Band title="Themes" note="Ways into the market that are not a ticker you already know." seeAllHref="/explore">
      <div className="markets-theme-grid">
        {themes.map((theme) => (
          <article key={theme.slug} className="markets-theme">
            <h3 className="markets-theme-name">{theme.name}</h3>
            <p className="markets-theme-deck">{theme.deck}</p>
            <div className="markets-theme-list">
              {theme.constituents.map((c) => (
                <Link key={c.symbol} href={`/markets/${c.symbol}`} className="markets-theme-row focus-ring">
                  <span className="num w-14 shrink-0 font-semibold">{c.symbol}</span>
                  <span className="flex-1 text-right">
                    <Px value={c.price} />
                  </span>
                  <DayChange percent={c.changePercent} />
                </Link>
              ))}
            </div>
            <p className="markets-theme-foot">
              {theme.publicationsThisWeek} Stoa{" "}
              {theme.publicationsThisWeek === 1 ? "publication" : "publications"} this week
            </p>
          </article>
        ))}
      </div>
    </Band>
  );
}

/* ------------------------------------------------------------- covered --- */

function LeanChip({ lean }: { lean: CallLean }) {
  const total = lean.long + lean.short;
  if (total === 0) return <span className="markets-pending">No open calls</span>;
  const longMajority = lean.long >= lean.short;
  return (
    <span className="markets-lean num">
      <span style={{ color: longMajority ? "var(--up)" : "var(--text-mute)" }}>{lean.long} long</span>
      <span aria-hidden className="text-text-faint"> · </span>
      <span style={{ color: longMajority ? "var(--text-mute)" : "var(--down)" }}>{lean.short} short</span>
    </span>
  );
}

export function ExploreCovered({ rows }: { rows: CoveredRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Band
      title="Where analysts are looking"
      note="The names carrying the most Stoa coverage right now."
      seeAllHref="/explore"
    >
      <div className="mt-2">
        {rows.map((r) => (
          <div key={r.symbol} className="markets-row">
            <Link href={`/markets/${r.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={r.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{r.company}</span>
            </Link>
            <Px value={r.price} />
            <DayChange percent={r.changePercent} />
            <span className="markets-row-meta num">
              {r.newPublications} new · {r.analystCount}{" "}
              {r.analystCount === 1 ? "analyst" : "analysts"}
            </span>
            <LeanChip lean={r.lean} />
            <FollowTicker ticker={r.symbol} />
          </div>
        ))}
      </div>
    </Band>
  );
}

/* --------------------------------------------------------- newly called --- */

export function ExploreNewlyCalled({ rows }: { rows: NewlyCalledRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Band
      title="Newly called"
      note="Names that just received their first call on Stoa."
      seeAllHref="/explore"
    >
      <div className="mt-2">
        {rows.map((r) => (
          <div key={r.symbol} className="markets-row">
            <Link href={`/markets/${r.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={r.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{r.company}</span>
            </Link>
            <Link
              href={`/analyst/${r.analyst.handle}`}
              className="focus-ring inline-flex items-center gap-2.5 rounded-[var(--radius-btn)]"
            >
              <Avatar src={r.analyst.avatarUrl} name={r.analyst.displayName} size="sm" />
              <span className="hidden text-[0.8125rem] font-semibold text-text sm:inline">
                {r.analyst.displayName}
              </span>
            </Link>
            <ScoreRing score={r.analyst.score} size="sm" provisional={r.analyst.provisional} />
            <DirectionTag direction={r.direction} />
            <span className="markets-row-meta num">Called {sinceLabel(r.calledAt).toLowerCase()}</span>
          </div>
        ))}
      </div>
    </Band>
  );
}

/* ------------------------------------------------------------ movement --- */

/**
 * DAY-CHANGE-PENDING
 *
 * Both columns are entirely derived from data the platform does not hold:
 * movers need a day change, unusual volume needs current and average volume on
 * the list path. The band renders its structure with reserved rows rather than
 * inventing movers, so the shape is reviewable and fills in later.
 */
export function ExploreMovement() {
  return (
    <Band title="Movement" note="What moved today, and where the volume was unusual.">
      <div className="markets-movement">
        <div>
          <h3 className="band-col-title mb-2">Today&apos;s movers</h3>
          <MovementPlaceholder reason="Waiting on day change" rows={4} />
        </div>
        <div>
          <h3 className="band-col-title mb-2">Unusual volume</h3>
          <MovementPlaceholder reason="Waiting on volume" rows={4} />
        </div>
      </div>
      <p className="markets-gap-note">
        Movers and volume need per-symbol day change and average volume, which the list quote path
        does not return yet.
      </p>
    </Band>
  );
}

function MovementPlaceholder({ reason, rows }: { reason: string; rows: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="markets-row markets-row--reserved" aria-hidden>
          <span className="markets-pending flex-1">{reason}</span>
          <DayChange percent={null} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- sectors --- */

export function ExploreSectors({ sectors }: { sectors: SectorTile[] }) {
  if (sectors.length === 0) return null;
  return (
    <Band title="Sectors" note="The whole market, twelve ways." seeAllHref="/explore">
      <div className="markets-sector-grid">
        {sectors.map((s) => (
          <div key={s.name} className="markets-sector">
            <Link
              href={`/markets/sector/${encodeURIComponent(s.name)}`}
              className="focus-ring flex items-baseline justify-between gap-2 rounded-[var(--radius-btn)]"
            >
              <span className="markets-sector-name">{s.name}</span>
              <DayChange percent={s.changePercent} />
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="markets-row-meta num">
                {s.publications} {s.publications === 1 ? "publication" : "publications"}
              </span>
              <FollowSector sector={s.name} />
            </div>
          </div>
        ))}
      </div>
    </Band>
  );
}

/* ---------------------------------------------------------------- ETFs --- */

/**
 * The featured funds are curated in `CURATED_ETFS` rather than read from the
 * instrument table, which is equities only. Each row's Stoa activity is real;
 * every other fund the provider recognizes is reachable through search.
 */
export function ExploreEtfs({ rows }: { rows: EtfBandRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Band
      title="ETFs by Stoa activity"
      note="Funds analysts are publishing on."
      seeAllHref="/markets"
    >
      <div className="mt-2">
        {rows.map((e) => (
          <div key={e.symbol} className="markets-row">
            <Link href={`/markets/${e.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={e.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{e.name}</span>
            </Link>
            {/* DAY-CHANGE-PENDING: the band uses the list quote path. */}
            <DayChange percent={null} />
            <span className="markets-row-meta num">
              {e.publications} {e.publications === 1 ? "publication" : "publications"}
            </span>
            <FollowTicker ticker={e.symbol} />
          </div>
        ))}
      </div>
      <p className="markets-gap-note">
        Featured funds are curated. Any other fund is reachable through search.
      </p>
    </Band>
  );
}

/* ----------------------------------------------------------- uncovered --- */

export function ExploreUncovered({ rows }: { rows: MarketRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Band title="Uncovered" note="Nobody on Stoa has called these.">
      <div className="mt-2">
        {rows.map((r) => (
          <div key={r.symbol} className="markets-row">
            <Link href={`/markets/${r.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={r.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{r.company}</span>
            </Link>
            <span className="num tabular-nums text-text-mute">
              {r.marketCap == null ? (
                <span className="markets-pending">No market cap</span>
              ) : (
                compact(r.marketCap)
              )}
            </span>
            <span className="markets-row-meta num">No coverage yet</span>
            <FollowTicker ticker={r.symbol} />
          </div>
        ))}
      </div>
    </Band>
  );
}
