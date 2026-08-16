"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TickerChip } from "@/components/ui/ticker-chip";
import { TodayBand } from "@/components/today/today-band";
import { useWatchlist } from "@/lib/watchlist";
import { price as fmtPrice } from "@/lib/format";
import type { TodayTicker } from "@/lib/today/types";

const SHOWN = 5;

/**
 * Your Tickers. Client-side because the watchlist lives in localStorage until
 * a `watchlists` table exists; the symbols are the reader's real ones, and
 * company, price, and coverage counts are resolved server-side from them.
 *
 * Day change is absent rather than invented: the market provider chain
 * normalizes quotes down to a price and carries no previous close, so there is
 * nothing truthful to colour green or red yet.
 */
export function TodayTickers() {
  const { tickers, ready } = useWatchlist();
  const [rows, setRows] = useState<TodayTicker[] | null>(null);

  const watched = tickers.slice(0, SHOWN);
  const key = watched.join(",");

  useEffect(() => {
    if (!key) {
      setRows([]);
      return;
    }
    let live = true;
    fetch(`/api/today/tickers?symbols=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { tickers: [] }))
      .then((data: { tickers: TodayTicker[] }) => {
        if (live) setRows(data.tickers ?? []);
      })
      .catch(() => {
        if (live) setRows([]);
      });
    return () => {
      live = false;
    };
  }, [key]);

  if (!ready) return null;

  return (
    <TodayBand title="Your Tickers" note="Names you watch." seeAllHref="/watchlist">
      {watched.length === 0 ? (
        <p className="py-6 text-sm text-text-mute">
          You are not watching any tickers yet.{" "}
          <Link href="/markets" className="underline hover:no-underline">
            Browse markets
          </Link>{" "}
          to start a watchlist.
        </p>
      ) : (
        <div className="mt-2">
          {(rows ?? watched.map(toPending)).map((row) => (
            <TickerRow key={row.symbol} row={row} />
          ))}
          <p className="today-gap-note">
            Day change is not shown: the market data layer does not carry a previous close yet.
          </p>
        </div>
      )}
    </TodayBand>
  );
}

function toPending(symbol: string): TodayTicker {
  return { symbol, company: null, price: null, publicationsToday: 0 };
}

function TickerRow({ row }: { row: TodayTicker }) {
  return (
    <div className="today-ticker-row">
      <TickerChip ticker={row.symbol} href={`/markets/${row.symbol}`} />
      <span className="min-w-0 flex-1 truncate text-sm text-text">{row.company ?? " "}</span>
      <span className="num text-sm font-semibold tabular-nums text-text">
        {row.price == null ? <span className="today-pending">No price</span> : fmtPrice(row.price)}
      </span>
      <span className="num text-[0.625rem] uppercase tracking-[0.12em] text-text-faint">
        {row.publicationsToday} new{" "}
        {row.publicationsToday === 1 ? "publication" : "publications"} today
      </span>
    </div>
  );
}
