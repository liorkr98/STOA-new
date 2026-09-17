import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIP_RECONCILE_FOLLOW_UP_SECONDS,
  EMPTY_UPLOAD_GIVE_UP_ATTEMPT,
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

  it("gives up on an empty post-TUS upload in under a minute", () => {
    const waited = CLIP_RECONCILE_FOLLOW_UP_SECONDS.slice(0, EMPTY_UPLOAD_GIVE_UP_ATTEMPT).reduce(
      (sum, n) => sum + n,
      0,
    );
    assert.equal(waited < 60, true);
    assert.equal(EMPTY_UPLOAD_GIVE_UP_ATTEMPT > 0, true);
  });
});
