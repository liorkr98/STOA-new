import assert from "node:assert/strict";
import { test } from "node:test";
import { costUsd, dailyBudgetUsd, estimateUsd } from "@/lib/extension/detect/budget";

test("cost follows Haiku's price, with the long-prompt rate past 100K tokens", () => {
  assert.equal(costUsd(10_000, 2_000), (10_000 * 0.1 + 2_000 * 0.5) / 1e6);
  assert.equal(costUsd(200_000, 1_000), (200_000 * 0.5 + 1_000 * 2.5) / 1e6);
});

test("the estimate is never below the real cost of the same transcript", () => {
  assert.ok(estimateUsd(30_000, 16_000) >= costUsd(10_000, 2_000));
});

test("the daily cap comes from the environment, 5 dollars by default", () => {
  delete process.env.DETECT_DAILY_BUDGET_USD;
  assert.equal(dailyBudgetUsd(), 5);
  process.env.DETECT_DAILY_BUDGET_USD = "0.5";
  assert.equal(dailyBudgetUsd(), 0.5);
  process.env.DETECT_DAILY_BUDGET_USD = "nonsense";
  assert.equal(dailyBudgetUsd(), 5);
});
