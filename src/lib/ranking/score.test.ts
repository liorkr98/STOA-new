import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipPlaybackKey, diversify, pinRequestedClip, uniqueByKey } from "./rerank";
import { bayesRate, recencyScore, scoreExplore, scoreFeed, scoreItem } from "./score";
import type { RankingSignals, ViewerContext } from "./types";
import { EXPLORE_WEIGHTS, FEED_WEIGHTS } from "./weights";

const NOW = Date.parse("2026-08-23T12:00:00Z");

function ctx(over: Partial<ViewerContext> = {}): ViewerContext {
  return {
    followedAnalystIds: new Set(),
    watchlistTickers: new Set(),
    sectorInterests: new Set(),
    dismissedReportIds: new Set(),
    now: NOW,
    ...over,
  };
}

function signals(over: Partial<RankingSignals> = {}): RankingSignals {
  return {
    views: 100,
    likes: 10,
    comments: 4,
    playCount: 80,
    completionCount: 32,
    clickThroughCount: 8,
    saveCount: 0,
    shareCount: 0,
    publishedAt: "2026-08-22T12:00:00Z",
    ticker: "NVDA",
    sector: "Semiconductors",
    tags: [],
    analystId: "a1",
    ...over,
  };
}

describe("ranking weights", () => {
  it("sums to 1 on each surface", () => {
    const feed = Object.values(FEED_WEIGHTS).reduce((a, b) => a + b, 0);
    const explore = Object.values(EXPLORE_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(feed - 1) < 1e-9, `feed weights ${feed}`);
    assert.ok(Math.abs(explore - 1) < 1e-9, `explore weights ${explore}`);
  });

  it("carries no term for the analyst's record", () => {
    assert.ok(!("moat" in FEED_WEIGHTS));
    assert.ok(!("moat" in EXPLORE_WEIGHTS));
  });
});

describe("length-normalized completion", () => {
  it("scores a rate, so 8/10 completions beat 8/40", () => {
    const high = bayesRate(8, 10);
    const low = bayesRate(8, 40);
    assert.ok(high > low, `${high} should beat ${low}`);
  });

  it("does not treat seconds as the ranking unit", () => {
    const shortHigh = scoreFeed(
      signals({ playCount: 100, completionCount: 80, likes: 0, comments: 0, views: 100 }),
      ctx(),
    );
    const longLow = scoreFeed(
      signals({ playCount: 100, completionCount: 40, likes: 0, comments: 0, views: 100 }),
      ctx(),
    );
    assert.ok(shortHigh.parts.completion > longLow.parts.completion);
    assert.ok(shortHigh.score > longLow.score);
  });
});

describe("likes and comments decide", () => {
  it("ranks a busy clip above a quiet one on Feed", () => {
    const busy = scoreFeed(
      signals({ likes: 80, comments: 30, views: 200, playCount: 180, completionCount: 40 }),
      ctx(),
    );
    const quiet = scoreFeed(
      signals({ likes: 1, comments: 0, views: 200, playCount: 180, completionCount: 20 }),
      ctx(),
    );
    assert.ok(busy.score > quiet.score, `busy ${busy.score} vs quiet ${quiet.score}`);
  });

  it("does the same on Explore", () => {
    const busy = scoreExplore(
      signals({ likes: 80, comments: 30, views: 200 }),
      ctx(),
    );
    const quiet = scoreExplore(
      signals({ likes: 1, comments: 0, views: 200 }),
      ctx(),
    );
    assert.ok(busy.score > quiet.score, `busy ${busy.score} vs quiet ${quiet.score}`);
  });
});

describe("recency", () => {
  it("decays over about a week", () => {
    const fresh = recencyScore("2026-08-22T12:00:00Z", NOW);
    const week = recencyScore("2026-08-16T12:00:00Z", NOW);
    const old = recencyScore("2026-08-01T12:00:00Z", NOW);
    assert.ok(fresh > week);
    assert.ok(week > old);
    assert.ok(week < 0.45 && week > 0.3, `7-day recency was ${week}`);
  });
});

describe("no outcome penalty", () => {
  it("scores two identical clips identically, whatever became of their calls", () => {
    const a = scoreFeed(signals(), ctx());
    const b = scoreFeed(signals(), ctx());
    assert.equal(a.score, b.score);
    assert.ok(!("moat" in a.parts));
  });
});

describe("personal relevance", () => {
  it("boosts a Feed item whose ticker is on the watchlist", () => {
    const matched = scoreFeed(signals({ ticker: "NVDA" }), ctx({ watchlistTickers: new Set(["NVDA"]) }));
    const other = scoreFeed(signals({ ticker: "NVDA" }), ctx());
    assert.ok(matched.score > other.score);
    assert.ok(matched.reasons.includes("watchlist"));
  });

  it("downranks already-followed analysts on Explore, not on Feed", () => {
    const followed = ctx({ followedAnalystIds: new Set(["a1"]) });
    const stranger = ctx();
    const exploreFollowed = scoreExplore(signals(), followed);
    const exploreStranger = scoreExplore(signals(), stranger);
    const feedFollowed = scoreFeed(signals(), followed);
    const feedStranger = scoreFeed(signals(), stranger);
    assert.ok(exploreFollowed.score < exploreStranger.score);
    assert.equal(feedFollowed.score, feedStranger.score);
  });
});

describe("playback uniqueness", () => {
  it("treats the same file with different query strings as one video", () => {
    const a = clipPlaybackKey({
      id: "c1",
      bunny_video_guid: "guid-a",
      playback_url: "https://cdn.example/demo/clip-01.mp4?v=pack1",
    });
    const b = clipPlaybackKey({
      id: "c2",
      bunny_video_guid: "guid-b",
      playback_url: "https://cdn.example/demo/clip-01.mp4?v=pack2",
    });
    assert.equal(a, b);
  });

  it("keeps distinct files and HLS paths apart", () => {
    const mp4 = clipPlaybackKey({
      id: "c1",
      playback_url: "https://cdn.example/demo/clip-01.mp4",
    });
    const hls = clipPlaybackKey({
      id: "c2",
      playback_url: "https://vz.example/da4d86d7/playlist.m3u8",
    });
    assert.notEqual(mp4, hls);
  });

  it("keeps the highest-scoring clip when several reports share a file", () => {
    const scored = [
      {
        reportId: "low",
        score: 0.2,
        item: { id: "c-low", playback_url: "https://cdn.example/demo/clip-01.mp4?v=1" },
      },
      {
        reportId: "high",
        score: 0.9,
        item: { id: "c-high", playback_url: "https://cdn.example/demo/clip-01.mp4?v=2" },
      },
      {
        reportId: "other",
        score: 0.5,
        item: { id: "c-other", playback_url: "https://cdn.example/demo/clip-02.mp4" },
      },
    ].sort((a, b) => b.score - a.score);
    const unique = uniqueByKey(scored, (c) => clipPlaybackKey(c.item));
    assert.equal(unique.length, 2);
    assert.equal(unique[0]?.reportId, "high");
    assert.equal(unique[1]?.reportId, "other");
  });

  it("falls back to guid then id when there is no playback URL", () => {
    assert.equal(
      clipPlaybackKey({ id: "c1", bunny_video_guid: "g1", playback_url: null }),
      "guid:g1",
    );
    assert.equal(clipPlaybackKey({ id: "c2", playback_url: null }), "id:c2");
  });

  it("pins a requested report and drops the sibling that plays the same file", () => {
    const ranked = [
      {
        reportId: "winner",
        item: { id: "c-win", playback_url: "https://cdn.example/demo/clip-01.mp4" },
      },
      {
        reportId: "other",
        item: { id: "c-other", playback_url: "https://cdn.example/demo/clip-02.mp4" },
      },
    ];
    const pinned = pinRequestedClip(ranked, {
      reportId: "tapped",
      item: { id: "c-tap", playback_url: "https://cdn.example/demo/clip-01.mp4?v=pack1" },
    });
    assert.equal(pinned.length, 2);
    assert.equal(pinned[0]?.reportId, "tapped");
    assert.equal(pinned[1]?.reportId, "other");
  });
});

describe("diversity rerank", () => {
  it("breaks a run of one analyst and caps them inside a window", () => {
    const items = [
      ...Array.from({ length: 6 }, (_, i) => ({ analystId: "flood", id: `f${i}` })),
      ...Array.from({ length: 8 }, (_, i) => ({ analystId: `other-${i}`, id: `o${i}` })),
    ];
    const out = diversify(items, { maxConsecutive: 2, maxPerWindow: 4, windowSize: 12 });
    for (let i = 2; i < out.length; i++) {
      const run = [out[i - 2], out[i - 1], out[i]].every((x) => x.analystId === "flood");
      assert.equal(run, false, `three consecutive flood at ${i}`);
    }
    const first12 = out.slice(0, 12).filter((x) => x.analystId === "flood").length;
    assert.ok(first12 <= 4, `flood appeared ${first12} times in the window`);
    assert.equal(out.length, items.length);
  });
});

describe("scoreItem surface switch", () => {
  it("uses followProxy only on Explore", () => {
    const feed = scoreItem(signals(), ctx(), "feed");
    const explore = scoreItem(signals(), ctx(), "explore");
    assert.equal(feed.parts.followProxy, undefined);
    assert.ok(explore.parts.followProxy > 0);
  });
});
