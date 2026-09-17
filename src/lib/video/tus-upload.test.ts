import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TUS_CHUNK_BYTES, tusChunkEnd, tusResumeUrl } from "./tus-upload";

describe("tusResumeUrl", () => {
  it("resolves a relative Location against the TUS endpoint", () => {
    assert.equal(
      tusResumeUrl("https://video.bunnycdn.com/tusupload", "/tusupload/abc"),
      "https://video.bunnycdn.com/tusupload/abc",
    );
  });

  it("keeps an absolute Location", () => {
    assert.equal(
      tusResumeUrl("https://video.bunnycdn.com/tusupload", "https://video.bunnycdn.com/tusupload/abc"),
      "https://video.bunnycdn.com/tusupload/abc",
    );
  });

  it("refuses a missing Location rather than PATCHing a guessed path that stores nothing", () => {
    assert.throws(() => tusResumeUrl("https://video.bunnycdn.com/tusupload", null), /resume URL/);
    assert.throws(() => tusResumeUrl("https://video.bunnycdn.com/tusupload", "  "), /resume URL/);
  });
});

describe("tusChunkEnd", () => {
  it("sends a file smaller than the window in one PATCH", () => {
    assert.equal(tusChunkEnd(0, 1_000_000), 1_000_000);
  });

  it("splits a larger file on the window", () => {
    assert.equal(tusChunkEnd(0, TUS_CHUNK_BYTES + 10), TUS_CHUNK_BYTES);
    assert.equal(tusChunkEnd(TUS_CHUNK_BYTES, TUS_CHUNK_BYTES + 10), TUS_CHUNK_BYTES + 10);
  });
});
