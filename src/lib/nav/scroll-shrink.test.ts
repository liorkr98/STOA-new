import { test } from "node:test";
import assert from "node:assert/strict";
import { initialShrinkState, nextShrinkState, type ShrinkState } from "./scroll-shrink";

function run(ys: number[], from: ShrinkState = initialShrinkState(0)): ShrinkState {
  return ys.reduce((s, y) => nextShrinkState(s, y), from);
}

test("starts full size", () => {
  assert.equal(initialShrinkState(0).shrunk, false);
});

test("a deliberate scroll down shrinks the bar", () => {
  const s = run([40, 80, 120, 160]);
  assert.equal(s.shrunk, true);
});

test("a deliberate scroll up restores it", () => {
  const down = run([40, 80, 120, 160]);
  assert.equal(down.shrunk, true);
  const up = run([120, 80], down);
  assert.equal(up.shrunk, false);
});

test("jitter below the threshold never toggles", () => {
  const down = run([40, 80, 120, 160]);
  const ys: number[] = [];
  for (let i = 0; i < 40; i += 1) ys.push(160 + (i % 2 ? 3 : -3));
  const jittered = run(ys, down);
  assert.equal(jittered.shrunk, true, "a twitch must not restore the bar");
});

test("jitter never shrinks a full-size bar either", () => {
  const ys: number[] = [];
  for (let i = 0; i < 40; i += 1) ys.push(200 + (i % 2 ? 4 : -4));
  const s = run(ys, { shrunk: false, drift: 0, lastY: 200 });
  assert.equal(s.shrunk, false);
});

test("returning to the top always restores the bar", () => {
  const down = run([40, 80, 120, 160]);
  assert.equal(down.shrunk, true);
  assert.equal(run([0], down).shrunk, false);
});

test("a reversal restarts the count rather than netting off", () => {
  // Down 16 (under threshold), then up 16: net zero, and neither crosses.
  const s = run([216, 200], { shrunk: false, drift: 0, lastY: 200 });
  assert.equal(s.shrunk, false);
  // But a sustained 20px run in one direction does cross.
  assert.equal(run([220], { shrunk: false, drift: 0, lastY: 200 }).shrunk, true);
});
