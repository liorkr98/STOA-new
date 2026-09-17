import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIP_RECONCILE_FOLLOW_UP_SECONDS,
  nextClipReconcileDelaySeconds,
} from "./follow-up";

describe("clip reconcile follow-up", () => {
  it("covers more than eight minutes of waiting", () => {
    const total = CLIP_RECONCILE_FOLLOW_UP_SECONDS.reduce((sum, n) => sum + n, 0);
    assert.equal(total >= 8 * 60, true);
  });

  it("returns each delay in order and then stops", () => {
    for (const [i, seconds] of CLIP_RECONCILE_FOLLOW_UP_SECONDS.entries()) {
      assert.equal(nextClipReconcileDelaySeconds(i), seconds);
    }
    assert.equal(nextClipReconcileDelaySeconds(CLIP_RECONCILE_FOLLOW_UP_SECONDS.length), null);
    assert.equal(nextClipReconcileDelaySeconds(-1), null);
  });
});
