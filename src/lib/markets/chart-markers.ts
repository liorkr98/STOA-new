import type { Candle } from "@/lib/market/candle-types";
import type { OpenCall, ResolvedCall } from "@/lib/markets/call-types";

/** How far a call may sit from the nearest bar before we drop it. */
const DAY = 86_400;

export type MarkerTone = "up" | "down" | "brass" | "ink";

export interface TapeMarker {
  time: number;
  position: "inBar" | "aboveBar" | "belowBar";
  tone: MarkerTone;
  text: string;
  size: number;
  id: string;
}

export interface TapeEvent {
  label: string;
  analyst: string;
  kind: "hit" | "miss" | "near" | "open";
}

/**
 * Snap a timestamp onto an existing bar. Lightweight Charts markers must land
 * on a series point; a lock date at 16:01 otherwise vanishes.
 */
export function snapToBar(times: number[], unixSec: number, maxDelta = 3 * DAY): number | null {
  if (times.length === 0 || !Number.isFinite(unixSec)) return null;
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < unixSec) lo = mid + 1;
    else hi = mid;
  }
  const right = times[lo];
  const left = times[Math.max(0, lo - 1)];
  const nearest = Math.abs(right - unixSec) <= Math.abs(left - unixSec) ? right : left;
  return Math.abs(nearest - unixSec) <= maxDelta ? nearest : null;
}

function verdictLabel(outcome: ResolvedCall["outcome"]): string {
  if (outcome === "hit") return "HIT";
  if (outcome === "miss") return "MISS";
  return "NEAR";
}

function verdictTone(outcome: ResolvedCall["outcome"]): MarkerTone {
  if (outcome === "hit") return "up";
  if (outcome === "miss") return "down";
  return "brass";
}

function verdictKind(outcome: ResolvedCall["outcome"]): TapeEvent["kind"] {
  if (outcome === "hit") return "hit";
  if (outcome === "miss") return "miss";
  return "near";
}

/**
 * Yahoo-style event dots: one marker per bar. Two calls on the same session
 * share a seat rather than stacking labels. Open targets are not drawn as
 * full-width dashed lines (those collide when several analysts sit near the
 * same price). They are a small entry dot; the list under the chart has the rest.
 */
export function buildTapeMarkers(
  candles: Candle[],
  openCalls: OpenCall[],
  resolvedCalls: ResolvedCall[],
  showCalls: boolean,
): { markers: TapeMarker[]; eventsByTime: Map<number, TapeEvent[]> } {
  const eventsByTime = new Map<number, TapeEvent[]>();
  const markers: TapeMarker[] = [];
  if (!showCalls || candles.length < 2) return { markers, eventsByTime };

  const times = candles.map((c) => c.time);
  const used = new Set<string>();

  function push(time: number, event: TapeEvent, marker: TapeMarker) {
    const list = eventsByTime.get(time) ?? [];
    list.push(event);
    eventsByTime.set(time, list);
    const key = `${time}:${marker.text}`;
    if (used.has(key)) return;
    used.add(key);
    markers.push(marker);
  }

  for (const call of resolvedCalls) {
    const t = snapToBar(times, new Date(call.resolvedAt).getTime() / 1000);
    if (t == null) continue;
    const label = verdictLabel(call.outcome);
    push(
      t,
      { label, analyst: call.analyst.displayName, kind: verdictKind(call.outcome) },
      {
        time: t,
        position: "aboveBar",
        tone: verdictTone(call.outcome),
        text: label,
        size: 1,
        id: `v-${call.reportId}`,
      },
    );
  }

  for (const call of openCalls) {
    const t = snapToBar(times, new Date(call.lockedAt).getTime() / 1000);
    if (t == null) continue;
    push(
      t,
      { label: "OPEN", analyst: call.analyst.displayName, kind: "open" },
      {
        time: t,
        position: "inBar",
        tone: "ink",
        text: "",
        size: 0.8,
        id: `o-${call.reportId}`,
      },
    );
  }

  markers.sort((a, b) => a.time - b.time);
  return { markers, eventsByTime };
}

export function periodChangePct(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  if (!first) return null;
  return ((last - first) / first) * 100;
}
