import assert from "node:assert/strict";
import { test } from "node:test";
import { cardDue, clock, lineAt } from "./schedule.ts";
import type { VideoTicker } from "./types.ts";

const item = (ticker: string, start: number, end: number, kind: "card" | "line" = "card"): VideoTicker => ({
  ticker, name: ticker, what: null, etf: false, kind, start, end, stance: "bull", conditional: false,
});
const items = [item("JPM", 60, 180), item("GS", 200, 300), item("AAPL", 120, 125, "line")];
const none = { shown: new Set<string>(), dismissed: new Set<string>(), quiet: false };

test("a card pops while its stretch plays", () => {
  assert.equal(cardDue(items, 59, none), null);
  assert.equal(cardDue(items, 60, none)?.ticker, "JPM");
  assert.equal(cardDue(items, 150, none)?.ticker, "JPM");
  assert.equal(cardDue(items, 190, none), null);
});

test("seeking into a stretch pops it; past it does not", () => {
  assert.equal(cardDue(items, 250, none)?.ticker, "GS");
  assert.equal(cardDue(items, 400, none), null);
});

test("shown, dismissed and Quiet mode stop the pop", () => {
  assert.equal(cardDue(items, 100, { ...none, shown: new Set(["JPM"]) }), null);
  assert.equal(cardDue(items, 100, { ...none, dismissed: new Set(["JPM"]) }), null);
  assert.equal(cardDue(items, 100, { ...none, quiet: true }), null);
});

test("quick picks never pop", () => {
  assert.equal(cardDue([item("AAPL", 0, 100, "line")], 50, none), null);
});

test("the line holds what was reached and counts what is ahead", () => {
  const at = lineAt(items, 130, new Set());
  assert.deepEqual(at.reached.map((i) => i.ticker), ["JPM", "AAPL"]);
  assert.equal(at.ahead, 1);
});

test("clock", () => {
  assert.equal(clock(395), "6:35");
  assert.equal(clock(3723), "1:02:03");
});
