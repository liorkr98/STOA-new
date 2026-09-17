import { test } from "node:test";
import assert from "node:assert/strict";
import { railFor } from "./rail";

const draft = { hasWriter: true, hasClip: false, frozen: false };

test("the writer gets the tray and the assistant", () => {
  assert.deepEqual(railFor("thesis", draft), { tray: true, assistant: true });
});

test("the cards screen gets the tray alone", () => {
  assert.deepEqual(railFor("cards", draft), { tray: true, assistant: false });
  assert.deepEqual(railFor("cards", { ...draft, hasWriter: false }), { tray: true, assistant: false });
});

test("the video screen gets the tray only once a clip is loaded", () => {
  assert.equal(railFor("video", draft), null);
  assert.deepEqual(railFor("video", { ...draft, hasClip: true }), { tray: true, assistant: false });
});

test("a live publication's clip screen has no rail", () => {
  assert.equal(railFor("video", { ...draft, hasClip: true, frozen: true }), null);
});

test("the take, the call, the headline, the tags and publish have no rail", () => {
  for (const step of ["brief", "call", "headline", "tags", "publish"] as const) {
    assert.equal(railFor(step, { ...draft, hasClip: true }), null, step);
  }
});
