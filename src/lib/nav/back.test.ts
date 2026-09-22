import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPopHistory, HISTORY_BACK, resolveLeaveHref } from "./back";

describe("canPopHistory", () => {
  it("is false when Next has no stack yet", () => {
    assert.equal(canPopHistory(null), false);
    assert.equal(canPopHistory({}), false);
    assert.equal(canPopHistory({ idx: 0 }), false);
  });

  it("is true once the App Router has pushed a page", () => {
    assert.equal(canPopHistory({ idx: 1 }), true);
    assert.equal(canPopHistory({ idx: 4 }), true);
  });
});

describe("resolveLeaveHref", () => {
  it("pops history when the control asked to go back and a page is behind it", () => {
    assert.equal(
      resolveLeaveHref({
        wantsBack: true,
        canPop: true,
        pathname: "/studio",
        search: "",
        hash: "",
      }),
      HISTORY_BACK,
    );
  });

  it("uses the fallback when this is the first page in the stack", () => {
    assert.equal(
      resolveLeaveHref({
        wantsBack: true,
        canPop: false,
        pathname: "/studio",
        search: "",
        hash: "",
      }),
      "/studio",
    );
  });

  it("keeps an ordinary same-origin path", () => {
    assert.equal(
      resolveLeaveHref({
        wantsBack: false,
        canPop: true,
        pathname: "/feed",
        search: "?x=1",
        hash: "#a",
      }),
      "/feed?x=1#a",
    );
  });
});
