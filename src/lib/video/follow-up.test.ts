import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIP_RECONCILE_FOLLOW_UP_SECONDS,
  EMPTY_UPLOAD_GIVE_UP_ATTEMPT,
  ENCODE_FOLLOW_UP_COUNT,
  ENCODE_FOLLOW_UP_SECONDS,
  clipFollowUpHorizonSeconds,
  nextClipReconcileDelaySeconds,
} from "./follow-up";

describe("clip reconcile follow-up", () => {
  it("covers more than eight minutes on the short ramp", () => {
    const total = CLIP_RECONCILE_FOLLOW_UP_SECONDS.reduce((sum, n) => sum + n, 0);
    assert.equal(total >= 8 * 60, true);
  });

  it("keeps looking for more than two hours so a slow encode still goes live", () => {
    assert.equal(clipFollowUpHorizonSeconds() >= 2 * 60 * 60, true);
  });

  it("returns the ramp, then five-minute looks, then stops", () => {
    for (const [i, seconds] of CLIP_RECONCILE_FOLLOW_UP_SECONDS.entries()) {
      assert.equal(nextClipReconcileDelaySeconds(i), seconds);
    }
    const firstExtra = CLIP_RECONCILE_FOLLOW_UP_SECONDS.length;
    assert.equal(nextClipReconcileDelaySeconds(firstExtra), ENCODE_FOLLOW_UP_SECONDS);
    assert.equal(
      nextClipReconcileDelaySeconds(firstExtra + ENCODE_FOLLOW_UP_COUNT - 1),
      ENCODE_FOLLOW_UP_SECONDS,
    );
    assert.equal(nextClipReconcileDelaySeconds(firstExtra + ENCODE_FOLLOW_UP_COUNT), null);
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
