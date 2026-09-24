import { test } from "node:test";
import assert from "node:assert/strict";
import { periodChangePct } from "./chart-change";
import type { Candle } from "@/lib/market/candle-types";

test("periodChangePct is last over first", () => {
  const candles: Candle[] = [
    { time: 1, open: 100, high: 100, low: 100, close: 100 },
    { time: 2, open: 110, high: 110, low: 110, close: 110 },
  ];
  assert.equal(periodChangePct(candles), 10);
});

test("periodChangePct has nothing to say about a single bar", () => {
  assert.equal(periodChangePct([{ time: 1, open: 1, high: 1, low: 1, close: 1 }]), null);
});
