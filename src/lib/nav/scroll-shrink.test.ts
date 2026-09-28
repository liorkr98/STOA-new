import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialShrinkState,
  nextShrinkState,
  restingProgress,
  SHRINK_RANGE,
  type ShrinkState,
} from "./scroll-shrink";

function run(ys: number[], from: ShrinkState = initialShrinkState(0)): ShrinkState {
  return ys.reduce((s, y) => nextShrinkState(s, y), from);
}

test("starts full size", () => {
  assert.equal(initialShrinkState(0).progress, 0);
});

test("the bar moves with the scroll rather than jumping", () => {
  const quarter = run([SHRINK_RANGE / 4]);
  assert.equal(quarter.progress, 0.25);
  const half = run([SHRINK_RANGE / 2]);
  assert.equal(half.progress, 0.5);
});

test("a full range down shrinks it completely, and it stays there", () => {
  assert.equal(run([SHRINK_RANGE]).progress, 1);
  assert.equal(run([SHRINK_RANGE, 600, 1200]).progress, 1);
});

test("scrolling up opens it out by the same amount", () => {
  const down = run([400, 800]);
  const up = nextShrinkState(down, 800 - SHRINK_RANGE / 4);
  assert.equal(up.progress, 0.75);
  assert.equal(nextShrinkState(down, 800 - SHRINK_RANGE).progress, 0);
});

test("a resting thumb's twitch moves it by a hair, not a size", () => {
  const down = run([400, 800]);
  const ys: number[] = [];
  for (let i = 0; i < 40; i += 1) ys.push(800 + (i % 2 ? 2 : -2));
  const twitched = run(ys, down);
  assert.ok(twitched.progress > 0.9, `a twitch must not open the bar (got ${twitched.progress})`);
});

test("returning to the top always ends at full size", () => {
  const down = run([400, 800]);
  assert.equal(run([0], down).progress, 0);
  // Near the top it can be no smaller than the distance left allows.
  assert.equal(run([SHRINK_RANGE / 4], { progress: 1, lastY: SHRINK_RANGE / 4 + 1 }).progress, 0.25);
});

test("it rests at whichever end is nearer", () => {
  assert.equal(restingProgress(0.2), 0);
  assert.equal(restingProgress(0.5), 1);
  assert.equal(restingProgress(0.9), 1);
});
