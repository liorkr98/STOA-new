import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveJobDispatch } from "./dispatch";

describe("resolveJobDispatch", () => {
  it("prefers the queue whenever it exists", () => {
    assert.equal(resolveJobDispatch(true, true), "queue");
    assert.equal(resolveJobDispatch(true, false), "queue");
  });

  it("runs inline only when the caller asked and there is no queue", () => {
    assert.equal(resolveJobDispatch(false, true), "inline");
  });

  it("skips work on a page render when QStash is not configured", () => {
    assert.equal(resolveJobDispatch(false, false), "skip");
  });
});
