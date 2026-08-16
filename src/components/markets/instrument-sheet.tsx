"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import { DirectionTag } from "@/components/ui/tag";
import { CallsChart } from "@/components/markets/calls-chart";
import { DayChange } from "@/components/markets/day-change";
import { FollowTicker } from "@/components/markets/follow-control";
import { price as fmtPrice } from "@/lib/format";
import type { Candle } from "@/lib/market/candle-types";
import type { OpenCall, ResolvedCall, StockConsensus } from "@/lib/markets/call-types";

/** The sheet's smaller frame carries fewer lines before they crowd. */
const SHEET_TARGET_LINES = 3;
const SHEET_OPEN_CALLS = 3;

interface SheetPayload {
  symbol: string;
  name: string;
  isEtf: boolean;
  price: number | null;
  changePercent: number | null;
  candles: Candle[];
  openCalls: OpenCall[];
  resolvedCalls: ResolvedCall[];
  consensus: StockConsensus;
}

const SheetContext = createContext<{ open: (symbol: string) => void } | null>(null);

/** Any surface can open an instrument without navigating away from itself. */
export function useInstrumentSheet() {
  return useContext(SheetContext);
}

export function InstrumentSheetProvider({ children }: { children: ReactNode }) {
  const [symbol, setSymbol] = useState<string | null>(null);
  const open = useCallback((s: string) => setSymbol(s.toUpperCase()), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <SheetContext.Provider value={value}>
      {children}
      {symbol && <InstrumentSheet symbol={symbol} onClose={() => setSymbol(null)} />}
    </SheetContext.Provider>
  );
}

function InstrumentSheet({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const [data, setData] = useState<SheetPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null);
    setFailed(false);
    fetch(`/api/markets/sheet?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((payload: SheetPayload) => live && setData(payload))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [symbol]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={`${symbol} overview`}>
      <button type="button" className="sheet-scrim" onClick={onClose} aria-label="Close" />

      <aside className="sheet-panel scroll-area">
        <div className="sheet-head">
          <div className="min-w-0">
            <h2 className="sheet-name">{data?.name ?? symbol}</h2>
            <p className="sheet-sub">
              {symbol}
              {data?.isEtf ? (
                <>
                  <span aria-hidden> · </span>ETF
                </>
              ) : null}
            </p>
          </div>
          <button type="button" onClick={onClose} className="sheet-close focus-ring" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-price-row">
          <span className="sheet-price">
            {data?.price == null ? (
              <span className="markets-pending">No price</span>
            ) : (
              fmtPrice(data.price)
            )}
          </span>
          {/* DAY-CHANGE-PENDING: real when the single-symbol snapshot has it,
              reserved at the same width when it does not. */}
          <DayChange percent={data?.changePercent ?? null} />
          <FollowTicker ticker={symbol} className="ml-auto" />
        </div>

        {failed ? (
          <p className="markets-empty">Could not load {symbol} right now.</p>
        ) : !data ? (
          <p className="markets-pending mt-6 block">Loading {symbol}…</p>
        ) : (
          <>
            <CallsChart
              ticker={symbol}
              candles={data.candles}
              openCalls={data.openCalls}
              resolvedCalls={data.resolvedCalls}
              range="6M"
              maxTargetLines={SHEET_TARGET_LINES}
              compact
            />

            {data.consensus.openCount > 0 || data.consensus.resolvedCount > 0 ? (
              <div className="sheet-consensus">
                <div>
                  <p className="stock-consensus-figure">{data.consensus.openCount}</p>
                  <p className="stock-consensus-key">
                    Open · {data.consensus.long}L / {data.consensus.short}S
                  </p>
                </div>
                <div>
                  <p className="stock-consensus-figure">
                    {data.consensus.averageTarget == null
                      ? "-"
                      : fmtPrice(data.consensus.averageTarget)}
                  </p>
                  <p className="stock-consensus-key">Avg target</p>
                </div>
                <div>
                  <p className="stock-consensus-figure">
                    {data.consensus.hitRatePct == null ? "-" : `${data.consensus.hitRatePct}%`}
                  </p>
                  <p className="stock-consensus-key">Hit rate</p>
                </div>
              </div>
            ) : null}

            {data.openCalls.length > 0 && (
              <div className="sheet-calls">
                <h3 className="band-col-title">Open calls</h3>
                {data.openCalls.slice(0, SHEET_OPEN_CALLS).map((c) => (
                  <div key={c.reportId} className="sheet-call">
                    <Avatar src={c.analyst.avatarUrl} name={c.analyst.displayName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-text">
                      {c.analyst.displayName}
                    </span>
                    <ScoreRing score={c.analyst.score} size="sm" provisional={c.analyst.provisional} />
                    <DirectionTag direction={c.direction} />
                    <span className="num text-[0.75rem] tabular-nums">
                      {c.targetPrice == null ? "-" : fmtPrice(c.targetPrice)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Link href={`/markets/${symbol}`} className="sheet-full focus-ring" onClick={onClose}>
          Open full page
          <ArrowRight size={14} />
        </Link>
      </aside>
    </div>
  );
}

/**
 * A ticker chip that opens the sheet instead of navigating. Falls back to a
 * plain link when no provider is mounted, so it is safe anywhere.
 */
export function SheetTickerChip({ ticker }: { ticker: string }) {
  const sheet = useInstrumentSheet();
  const chip =
    "inline-flex items-center rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2 py-0.5 num text-[0.6875rem] font-semibold uppercase tracking-wider text-text transition-colors hover:border-border-strong focus-ring";

  if (!sheet) {
    return (
      <Link href={`/markets/${ticker}`} className={chip}>
        {ticker}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={chip}
      title={`${ticker} overview`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sheet.open(ticker);
      }}
    >
      {ticker}
    </button>
  );
}
