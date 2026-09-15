import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipDurationSeconds } from "./clip-duration";

describe("clipDurationSeconds", () => {
  it("rounds a finished Bunny duration", () => {
    assert.equal(clipDurationSeconds(12.6), 13);
    assert.equal(clipDurationSeconds(0), 0);
  });

  it("treats a missing length as zero instead of NaN", () => {
    assert.equal(clipDurationSeconds(undefined), 0);
    assert.equal(clipDurationSeconds(null), 0);
    assert.equal(clipDurationSeconds(Number.NaN), 0);
    assert.equal(clipDurationSeconds(Number.POSITIVE_INFINITY), 0);
    assert.equal(clipDurationSeconds(-4), 0);
  });
});
