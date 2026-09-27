import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPopHistory, DEPTH_KEY, HISTORY_BACK, resolveLeaveHref, withDepth } from "./back";

describe("canPopHistory", () => {
  it("is false on the first page of the app", () => {
    assert.equal(canPopHistory(null), false);
    assert.equal(canPopHistory({}), false);
    assert.equal(canPopHistory({ [DEPTH_KEY]: 0 }), false);
  });

  it("is true once a page has been opened from inside the app", () => {
    assert.equal(canPopHistory({ [DEPTH_KEY]: 1 }), true);
    assert.equal(canPopHistory({ [DEPTH_KEY]: 4 }), true);
  });

  it("ignores the Pages Router's idx, which the App Router never writes", () => {
    assert.equal(canPopHistory({ idx: 3 }), false);
  });
});

describe("withDepth", () => {
  it("adds the depth to the router's own state", () => {
    assert.deepEqual(withDepth({ __NA: true }, 2), { __NA: true, [DEPTH_KEY]: 2 });
  });

  it("stamps an entry pushed with no state", () => {
    assert.deepEqual(withDepth(null, 1), { [DEPTH_KEY]: 1 });
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
