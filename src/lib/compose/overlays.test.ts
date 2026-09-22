import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromStoredVideoEdit, toStoredVideoEdit, type Overlay, type VideoEdit } from "./overlays";

function editWith(overlays: Overlay[]): VideoEdit {
  return { durationSeconds: 12, trimStart: 0, trimEnd: 12, thumbnail: null, overlays };
}

describe("overlay image URLs", () => {
  it("drops blob URLs so a stored overlay is not a dead local link", () => {
    const stored = toStoredVideoEdit(
      editWith([
        {
          id: "img",
          kind: "visual",
          start: 1,
          end: 4,
          mode: "inset",
          position: 3,
          source: { type: "upload", label: "chart.png", imageUrl: "blob:https://stoa.local/abc" },
        },
      ]),
      [],
    );
    assert.equal(stored?.overlays.length, 1);
    const overlay = stored!.overlays[0];
    assert.equal(overlay.kind, "visual");
    if (overlay.kind !== "visual" || overlay.source.type !== "upload") throw new Error("expected upload overlay");
    assert.equal(overlay.source.imageUrl, null);
  });

  it("keeps an https image so the player can draw it", () => {
    const url = "https://cqhenicrfdkbsshyszex.supabase.co/storage/v1/object/public/report-images/u/a.png";
    const stored = toStoredVideoEdit(
      editWith([
        {
          id: "img",
          kind: "visual",
          start: 1,
          end: 4,
          mode: "inset",
          position: 3,
          source: { type: "upload", label: "chart.png", imageUrl: url },
        },
      ]),
      [],
    );
    const overlay = stored!.overlays[0];
    assert.equal(overlay.kind, "visual");
    if (overlay.kind !== "visual" || overlay.source.type !== "upload") throw new Error("expected upload overlay");
    assert.equal(overlay.source.imageUrl, url);
  });

  it("strips blob URLs when reading a stored edit back", () => {
    const read = fromStoredVideoEdit({
      version: 1,
      durationSeconds: 12,
      trimStart: 0,
      trimEnd: 12,
      overlays: [
        {
          id: "img",
          kind: "visual",
          start: 1,
          end: 4,
          mode: "inset",
          position: 3,
          source: { type: "figure", label: "shot", imageUrl: "blob:http://localhost:3000/x" },
        },
      ],
      cards: [],
    });
    const overlay = read!.overlays[0];
    assert.equal(overlay.kind, "visual");
    if (overlay.kind !== "visual" || overlay.source.type !== "figure") throw new Error("expected figure overlay");
    assert.equal(overlay.source.imageUrl, null);
  });
});
