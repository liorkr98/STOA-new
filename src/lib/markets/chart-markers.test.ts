import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTapeMarkers, periodChangePct, snapToBar } from "./chart-markers";
import type { Candle } from "@/lib/market/candle-types";
import type { OpenCall, ResolvedCall } from "@/lib/markets/call-types";

const DAY = 86_400;

test("snapToBar lands on the nearest existing session", () => {
  const times = [100, 200, 300];
  assert.equal(snapToBar(times, 190), 200);
  assert.equal(snapToBar(times, 100), 100);
  assert.equal(snapToBar(times, 10_000_000, DAY), null);
});

test("two verdicts on the same bar share one HIT label", () => {
  const candles: Candle[] = [
    { time: 1_700_000_000, open: 1, high: 1, low: 1, close: 100 },
    { time: 1_700_000_000 + DAY, open: 1, high: 1, low: 1, close: 110 },
  ];
  const analyst = {
    handle: "a",
    displayName: "Ada",
    avatarUrl: null,
    initials: "AA",
  };
  const resolved: ResolvedCall[] = [
    {
      reportId: "1",
      analyst,
      direction: "long",
      entryPrice: 100,
      exitPrice: 110,
      returnPct: 10,
      outcome: "hit",
      lockedAt: new Date(candles[0].time * 1000).toISOString(),
      resolvedAt: new Date(candles[1].time * 1000).toISOString(),
    },
    {
      reportId: "2",
      analyst,
      direction: "long",
      entryPrice: 100,
      exitPrice: 111,
      returnPct: 11,
      outcome: "hit",
      lockedAt: new Date(candles[0].time * 1000).toISOString(),
      resolvedAt: new Date((candles[1].time + 60) * 1000).toISOString(),
    },
  ];
  const { markers } = buildTapeMarkers(candles, [], resolved, true);
  const hits = markers.filter((m) => m.text === "HIT");
  assert.equal(hits.length, 1);
});

test("periodChangePct is last over first", () => {
  const candles: Candle[] = [
    { time: 1, open: 100, high: 100, low: 100, close: 100 },
    { time: 2, open: 110, high: 110, low: 110, close: 110 },
  ];
  assert.equal(periodChangePct(candles), 10);
});

test("open calls are unlabeled dots, not a second HIT", () => {
  const t0 = 1_700_000_000;
  const candles: Candle[] = [
    { time: t0, open: 1, high: 1, low: 1, close: 100 },
    { time: t0 + DAY, open: 1, high: 1, low: 1, close: 101 },
  ];
  const open: OpenCall[] = [
    {
      reportId: "o",
      analyst: { handle: "a", displayName: "Ada", avatarUrl: null, initials: "AA" },
      direction: "long",
      entryPrice: 100,
      targetPrice: 140,
      lockedAt: new Date(t0 * 1000).toISOString(),
      resolvesAt: new Date((t0 + 40 * DAY) * 1000).toISOString(),
      daysLeft: 40,
    },
  ];
  const { markers } = buildTapeMarkers(candles, open, [], true);
  assert.equal(markers.length, 1);
  assert.equal(markers[0]?.text, "");
  assert.equal(markers[0]?.tone, "ink");
});
