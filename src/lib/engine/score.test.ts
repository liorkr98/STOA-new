import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Direction, Outcome, Prediction } from "@/lib/types";
import { computeScore, gradeOutcome, percentileRank } from "./score";

function pred(
  i: number,
  outcome: Outcome,
  direction: Direction = "long",
  retPct = 10,
): Prediction {
  const lock = 100;
  const resolved = lock * (1 + retPct / 100);
  return {
    id: `p-${i}`,
    report_id: `r-${i}`,
    author_id: "author",
    ticker: "AAPL",
    direction,
    lock_price: lock,
    target_price: null,
    horizon_days: 30,
    target_horizon_date: "2026-01-01",
    resolves_at: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    resolution_trading_date: "2026-01-01",
    resolved_price: resolved,
    bench_lock_price: 100,
    benchmark_pct: 5,
    bench_resolved_price: 105,
    outcome,
    return_pct: retPct,
    created_at: new Date().toISOString(),
  };
}

describe("computeScore shrinkage", () => {
  it("returns zeroed result for no resolved calls", () => {
    const r = computeScore([]);
    assert.equal(r.total, 0);
    assert.equal(r.score, 0);
  });

  it("applies sample shrinkage at n=1", () => {
    const one = computeScore([pred(0, "hit", "long", 20)]);
    const many = computeScore(
      Array.from({ length: 50 }, (_, i) => pred(i, i % 5 === 0 ? "miss" : "hit", "long", 8)),
    );
    assert.ok(one.total === 1);
    assert.ok(many.total === 50);
    // Single perfect call should not outrank a large credible track record.
    assert.ok(one.score < many.score, `n=1 score ${one.score} should be < n=50 score ${many.score}`);
  });

  it("scores 2 perfect calls below 50 calls at 80% hit rate", () => {
    const lucky = computeScore([pred(0, "hit"), pred(1, "hit")]);
    const steady = computeScore(
      Array.from({ length: 50 }, (_, i) => pred(i, i < 40 ? "hit" : "miss")),
    );
    assert.equal(lucky.total, 2);
    assert.equal(steady.total, 50);
    assert.ok(
      lucky.score < steady.score,
      `2-call 100% (${lucky.score}) should score below 50-call 80% (${steady.score})`,
    );
  });

  it("excludes neutral outcomes from MOAT calculations", () => {
    const withNeutral = computeScore([
      pred(0, "hit"),
      { ...pred(1, "neutral"), outcome: "neutral", return_pct: 0 },
    ]);
    const hitsOnly = computeScore([pred(0, "hit")]);
    assert.equal(withNeutral.total, 1);
    assert.equal(hitsOnly.total, 1);
  });
});

describe("percentileRank", () => {
  it("returns 50 for empty distribution", () => {
    assert.equal(percentileRank(5, []), 50);
  });
});

describe("gradeOutcome", () => {
  it("grades long hit when price exceeds target", () => {
    assert.equal(
      gradeOutcome({ direction: "long", lock_price: 100, target_price: 110, resolved_price: 115 }),
      "hit",
    );
  });
});
