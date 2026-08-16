import { CallsChart } from "@/components/markets/calls-chart";
import {
  StockConsensusBlock,
  StockHeader,
  StockOpenCalls,
  StockResolvedHistory,
} from "@/components/markets/stock-sections";
import type { Candle } from "@/lib/market/candle-types";
import type { OpenCall, ResolvedCall, StockAnalyst } from "@/lib/markets/call-types";

/**
 * Dev-only seeded stock page so the calls overlay on the chart can be reviewed
 * without a database: target lines, the consensus band, entry dots, and the
 * resolution seals all need predictions to exist.
 */

const DAY = 86_400;
const NOW = Math.floor(Date.UTC(2026, 7, 16) / 1000);

/** Deterministic walk; no Math.random so the page renders identically twice. */
function candles(): Candle[] {
  const out: Candle[] = [];
  let v = 190;
  for (let i = 260; i >= 0; i--) {
    const t = NOW - i * DAY;
    v += Math.sin(i / 11) * 2.4 + Math.cos(i / 29) * 1.7 + 0.08;
    const close = Math.round(v * 100) / 100;
    out.push({ time: t, open: close, high: close + 1.5, low: close - 1.5, close });
  }
  return out;
}

function analyst(name: string, handle: string, score: number, provisional = false): StockAnalyst {
  return {
    handle,
    displayName: name,
    avatarUrl: null,
    score,
    provisional,
    initials: name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
  };
}

const LK = analyst("Lena Kowalczyk", "lenakw", 84);
const KT = analyst("Kai Tanaka", "kaitanaka", 79);
const MW = analyst("Marcus Webb", "marcus_webb", 74);
const PR = analyst("Priya Raman", "priya_raman", 71);
const NH = analyst("Noor Haddad", "noorhaddad", 66);
const AB = analyst("Aisha Bello", "aishab", 58, true);
const TR = analyst("Tomas Reyes", "tomasr", 55);

function iso(daysAgo: number): string {
  return new Date((NOW - daysAgo * DAY) * 1000).toISOString();
}

const openCalls: OpenCall[] = [
  { reportId: "o1", analyst: LK, direction: "long", entryPrice: 214.2, targetPrice: 268, lockedAt: iso(40), resolvesAt: iso(-140), daysLeft: 140 },
  { reportId: "o2", analyst: KT, direction: "long", entryPrice: 208.9, targetPrice: 252, lockedAt: iso(62), resolvesAt: iso(-95), daysLeft: 95 },
  { reportId: "o3", analyst: MW, direction: "short", entryPrice: 231.4, targetPrice: 186, lockedAt: iso(21), resolvesAt: iso(-70), daysLeft: 70 },
  { reportId: "o4", analyst: PR, direction: "long", entryPrice: 199.5, targetPrice: 240, lockedAt: iso(88), resolvesAt: iso(-52), daysLeft: 52 },
  { reportId: "o5", analyst: NH, direction: "long", entryPrice: 221.0, targetPrice: 258, lockedAt: iso(33), resolvesAt: iso(-31), daysLeft: 31 },
  { reportId: "o6", analyst: AB, direction: "long", entryPrice: 205.1, targetPrice: 275, lockedAt: iso(70), resolvesAt: iso(-120), daysLeft: 120 },
  { reportId: "o7", analyst: TR, direction: "short", entryPrice: 228.0, targetPrice: 178, lockedAt: iso(15), resolvesAt: iso(-60), daysLeft: 60 },
];

const resolvedCalls: ResolvedCall[] = [
  { reportId: "r1", analyst: LK, direction: "long", entryPrice: 178.4, exitPrice: 214.9, returnPct: 20.5, outcome: "hit", lockedAt: iso(210), resolvedAt: iso(48) },
  { reportId: "r2", analyst: MW, direction: "short", entryPrice: 226.1, exitPrice: 233.8, returnPct: -3.4, outcome: "miss", lockedAt: iso(160), resolvedAt: iso(30) },
  { reportId: "r3", analyst: KT, direction: "long", entryPrice: 192.0, exitPrice: 219.4, returnPct: 14.3, outcome: "hit", lockedAt: iso(190), resolvedAt: iso(12) },
  { reportId: "r4", analyst: PR, direction: "long", entryPrice: 201.7, exitPrice: 206.2, returnPct: 2.2, outcome: "near", lockedAt: iso(140), resolvedAt: iso(65) },
];

export default function DevMarketsPage() {
  const calls = {
    openCalls,
    resolvedCalls,
    consensus: {
      openCount: openCalls.length,
      long: openCalls.filter((c) => c.direction === "long").length,
      short: openCalls.filter((c) => c.direction === "short").length,
      averageTarget:
        openCalls.reduce((s, c) => s + (c.targetPrice ?? 0), 0) / openCalls.length,
      averageScore: Math.round(
        openCalls.reduce((s, c) => s + (c.analyst.score ?? 0), 0) / openCalls.length,
      ),
      hitRatePct: 50,
      resolvedCount: resolvedCalls.length,
    },
  };

  return (
    <article className="markets-page mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <StockHeader
        ticker="NVDA"
        name="NVIDIA"
        exchange="NASDAQ"
        currentPrice={225.16}
        changePercent={-0.1}
        marketCap={5.5e12}
        forwardPe={38.4}
        low52={164.07}
        high52={236.54}
      />

      <CallsChart
        ticker="NVDA"
        candles={candles()}
        openCalls={openCalls}
        resolvedCalls={resolvedCalls}
        range="1Y"
      />

      <StockConsensusBlock ticker="NVDA" consensus={calls.consensus} />
      <StockOpenCalls calls={openCalls} />
      <StockResolvedHistory calls={resolvedCalls} />
    </article>
  );
}
