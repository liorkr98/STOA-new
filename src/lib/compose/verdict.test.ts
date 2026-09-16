import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResolvedSymbol } from "@/lib/market/resolve-symbol";
import {
  formatMarketCap,
  horizonInRange,
  unlockLine,
  verdictEligibility,
  verdictWindow,
} from "./verdict";

function equity(symbol: string, marketCap: number | null): ResolvedSymbol {
  return {
    symbol,
    found: true,
    name: `${symbol} Inc.`,
    kind: "equity",
    exchange: "NASDAQ",
    unit: null,
    price: 10,
    marketCap,
    priceLabel: "$10.00",
    quotedAsYield: false,
    directionNote: null,
  };
}

describe("verdictEligibility", () => {
  it("accepts an equity under $2B", () => {
    const r = verdictEligibility(equity("AXTI", 380_000_000));
    assert.equal(r.ok, true);
  });

  it("refuses an equity at or over $2B and names its size", () => {
    const r = verdictEligibility(equity("NVDA", 3_200_000_000_000));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.kind, "too_large");
      assert.match(r.reason, /\$3\.2T/);
    }
  });

  it("refuses a macro instrument in plain words", () => {
    const r = verdictEligibility({ ...equity("XAUUSD", null), kind: "commodity", name: "Gold", exchange: null });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.kind, "macro");
      assert.match(r.reason, /no market cap/);
    }
  });

  it("refuses a listing with no market cap on file rather than guessing", () => {
    const r = verdictEligibility(equity("TINY", null));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.kind, "unknown_cap");
  });
});

describe("horizon", () => {
  it("is 7 to 180 days inclusive", () => {
    assert.equal(horizonInRange(6), false);
    assert.equal(horizonInRange(7), true);
    assert.equal(horizonInRange(180), true);
    assert.equal(horizonInRange(181), false);
  });
});

describe("verdictWindow", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");

  it("is open with no earlier verdict", () => {
    assert.deepEqual(verdictWindow(null, now), { open: true });
  });

  it("counts thirty rolling days from the last publish, not the calendar month", () => {
    const w = verdictWindow("2026-08-29T12:00:00Z", now);
    assert.equal(w.open, false);
    if (!w.open) {
      assert.equal(w.daysLeft, 12);
      assert.equal(w.line, "Your next verdict unlocks in 12 days");
    }
  });

  it("opens again exactly thirty days later", () => {
    assert.equal(verdictWindow("2026-08-17T12:00:00Z", now).open, true);
    assert.equal(verdictWindow("2026-08-17T12:00:01Z", now).open, false);
  });

  it("says tomorrow on the last day", () => {
    assert.equal(unlockLine(1), "Your next verdict unlocks tomorrow");
  });
});

describe("formatMarketCap", () => {
  it("prints millions, billions and trillions", () => {
    assert.equal(formatMarketCap(380_000_000), "$380M");
    assert.equal(formatMarketCap(1_950_000_000), "$2B");
    assert.equal(formatMarketCap(1_850_000_000), "$1.9B");
    assert.equal(formatMarketCap(3_200_000_000_000), "$3.2T");
  });
});
