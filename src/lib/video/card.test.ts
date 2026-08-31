import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { isHlsUrl } from "./direct";
import type { VideoClipCard } from "@/lib/db/video-clips";
import type { Report } from "@/lib/types";

/**
 * `VideoCard` renders `embedUrl` inside an iframe for anything that is not a
 * direct file. An HLS manifest in that slot loads a playlist as a document
 * instead of a player, so this pins the one invariant that prevents it.
 */

let toVideoCardData: typeof import("./card").toVideoCardData;

before(async () => {
  process.env.BUNNY_STREAM_LIBRARY_ID = "1234";
  process.env.BUNNY_STREAM_API_KEY = "test-key";
  process.env.BUNNY_STREAM_CDN_HOSTNAME = "vz-test.b-cdn.net";
  ({ toVideoCardData } = await import("./card"));
});

const GUID = "8f3c0000-0000-4000-8000-000000000000";

function clip(playbackUrl: string): VideoClipCard {
  const report = {
    id: "r-1",
    title: "Check Point: cloud mix is past the margin inflection",
    summary: null,
    ticker: "CHKP",
    access: "free",
    price: null,
    position_held: false,
    compensation_tied: false,
    author: { id: "a-1", handle: "ben", display_name: "Ben Shapira", avatar_url: null },
    prediction: null,
  } as unknown as Report;

  return {
    id: "c-1",
    report_id: "r-1",
    creator_id: "a-1",
    bunny_video_guid: GUID,
    playback_url: playbackUrl,
    thumbnail_url: "https://vz-test.b-cdn.net/8f3c/thumbnail.jpg",
    preview_url: "https://vz-test.b-cdn.net/8f3c/preview.webp",
    caption_vtt_url: null,
    transcript: null,
    duration_seconds: 42,
    status: "ready",
    fact_check_results: null,
    created_at: "2026-08-01T00:00:00Z",
    published_at: "2026-08-01T00:00:00Z",
    report,
  };
}

describe("toVideoCardData", () => {
  it("never puts an HLS manifest in the iframe slot", () => {
    const data = toVideoCardData(clip("https://vz-test.b-cdn.net/8f3c/playlist.m3u8"));
    assert.ok(data);
    assert.equal(isHlsUrl(data.embedUrl), false);
    assert.match(data.embedUrl, /iframe\.mediadelivery\.net\/embed\//);
  });

  it("keeps the manifest available for players that can drive it", () => {
    const src = "https://vz-test.b-cdn.net/8f3c/playlist.m3u8";
    const data = toVideoCardData(clip(src));
    assert.ok(data);
    assert.equal(data.playbackUrl, src);
  });

  it("lets a direct file stand in for the embed, since no iframe is used", () => {
    const src = "https://vz-test.b-cdn.net/8f3c/video.mp4";
    const data = toVideoCardData(clip(src));
    assert.ok(data);
    assert.equal(data.embedUrl, src);
    assert.equal(data.playbackUrl, src);
  });

  it("returns null for a clip whose report failed to join", () => {
    const orphan = { ...clip("https://vz-test.b-cdn.net/8f3c/playlist.m3u8"), report: null };
    assert.equal(toVideoCardData(orphan), null);
  });
});
