import assert from "node:assert/strict";
import { test } from "node:test";
import { watchVideoId } from "./watch.ts";

const at = (path: string) => watchVideoId(new URL(`https://www.youtube.com${path}`));

test("only a watch page has a video to read", () => {
  assert.equal(at("/watch?v=uhiQzbgiICY"), "uhiQzbgiICY");
  assert.equal(at("/watch?v=uhiQzbgiICY&t=395s&list=PL1"), "uhiQzbgiICY");
});

test("Shorts, live pages, the home page, search and channels are skipped", () => {
  assert.equal(at("/shorts/abcdefghijk"), null);
  assert.equal(at("/live/abcdefghijk"), null);
  assert.equal(at("/"), null);
  assert.equal(at("/results?search_query=nvda"), null);
  assert.equal(at("/@Micha.Stocks/videos"), null);
  assert.equal(at("/feed/subscriptions"), null);
  assert.equal(at("/watch?v=bad"), null);
});
