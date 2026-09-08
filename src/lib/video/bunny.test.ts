import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAbandonedUpload } from "./bunny";

/**
 * The fault this predicate exists to name.
 *
 * Two clips uploaded on 1 September sat at "processing" for six days. Bunny's
 * own embed page said "Processing video", so it read as a stalled transcoder,
 * and the next step would have been a support ticket and possibly a bigger
 * plan. Bunny's API told the real story: status 0 with `storageSize: 0`. The
 * browser upload never delivered a byte, so there was never anything to encode.
 *
 * Bunny reports the same status 0 for a record that is seconds old and about to
 * receive its upload, so the age check is what separates "about to arrive" from
 * "never coming". Removing either half of that puts the week back.
 */

/** Bunny's shape: UTC, no offset suffix. */
function bunnyDate(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString().replace(/\.\d+Z$/, ".000");
}

const HOUR = 60 * 60 * 1000;

describe("isAbandonedUpload", () => {
  it("names the 1 September fault: no bytes, long past the upload window", () => {
    assert.equal(
      isAbandonedUpload({ status: 0, storageSize: 0, dateUploaded: bunnyDate(6 * 24 * HOUR) }),
      true,
    );
  });

  it("leaves a fresh record alone, because its upload is still in flight", () => {
    assert.equal(
      isAbandonedUpload({ status: 0, storageSize: 0, dateUploaded: bunnyDate(5 * 60 * 1000) }),
      false,
    );
    assert.equal(
      isAbandonedUpload({ status: 0, storageSize: 0, dateUploaded: bunnyDate(2 * HOUR) }),
      false,
    );
  });

  it("leaves a clip that did deliver its bytes to Bunny", () => {
    assert.equal(
      isAbandonedUpload({
        status: 0,
        storageSize: 66_007_755,
        dateUploaded: bunnyDate(6 * 24 * HOUR),
      }),
      false,
    );
  });

  it("never claims a clip Bunny is actually working on or has settled", () => {
    for (const status of [1, 2, 3, 4, 5, 6]) {
      assert.equal(
        isAbandonedUpload({ status, storageSize: 0, dateUploaded: bunnyDate(6 * 24 * HOUR) }),
        false,
        `status ${status}`,
      );
    }
  });

  it("stays false when Bunny sends no date or no size at all", () => {
    assert.equal(isAbandonedUpload({ status: 0, storageSize: 0 }), false);
    assert.equal(isAbandonedUpload({ status: 0, dateUploaded: bunnyDate(6 * 24 * HOUR) }), true);
    assert.equal(isAbandonedUpload({ status: 0, dateUploaded: "not a date" }), false);
  });

  it("reads Bunny's offsetless timestamp as UTC, not as local time", () => {
    // 7h ago in UTC. Read as local east of Greenwich this lands under the 6h
    // threshold and the clip would be left processing forever.
    const sevenHoursAgo = bunnyDate(7 * HOUR);
    assert.equal(!sevenHoursAgo.endsWith("Z"), true, "fixture must mirror Bunny's format");
    assert.equal(isAbandonedUpload({ status: 0, storageSize: 0, dateUploaded: sevenHoursAgo }), true);
  });
});
