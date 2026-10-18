/**
 * Media links: which stored URLs are private objects, the Stoa address they
 * are drawn through, Bunny's token formats, and the captions relay's allowlist.
 * `npm run test:media`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
const { privateObject, mediaSrc, isSafeObjectPath } = await import("@/lib/media/storage-url");
const { signBunnyCdnUrl, signBunnyEmbedUrl } = await import("@/lib/media/bunny-token");
const { allowedCaptionUrl } = await import("@/lib/video/caption-url");

const PUB = "https://proj.supabase.co/storage/v1/object/public";

test("private-bucket objects are recognised, everything else is left alone", () => {
  assert.deepEqual(privateObject(`${PUB}/report-images/u1/abc.png`), { bucket: "report-images", path: "u1/abc.png" });
  assert.deepEqual(privateObject(`${PUB}/demo-clips/investor/clip-03.mp4?v=pack1`), { bucket: "demo-clips", path: "investor/clip-03.mp4" });
  assert.deepEqual(privateObject("https://proj.supabase.co/storage/v1/object/sign/chart-snapshots/a/b.png?token=x"), { bucket: "chart-snapshots", path: "a/b.png" });
  assert.equal(privateObject(`${PUB}/avatars/u1.png`), null, "avatars stay public");
  assert.equal(privateObject("https://other.supabase.co/storage/v1/object/public/report-images/x.png"), null, "another project");
  assert.equal(privateObject(`${PUB}/report-images/../avatars/x.png`), null, "no traversal");
  assert.equal(privateObject("blob:https://stoa/123"), null);
  assert.equal(privateObject(null), null);
});

test("images are drawn through the Stoa address; other URLs pass through", () => {
  assert.equal(mediaSrc(`${PUB}/report-images/u1/a b.png`), "/m/report-images/u1/a%20b.png");
  assert.equal(mediaSrc("https://vz-x.b-cdn.net/g/thumbnail.jpg"), "https://vz-x.b-cdn.net/g/thumbnail.jpg");
  assert.equal(mediaSrc(null), null);
  assert.equal(isSafeObjectPath("a//b"), false);
});

test("Bunny CDN token: path form over the whole video folder", () => {
  const url = signBunnyCdnUrl("https://vz-x.b-cdn.net/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/playlist.m3u8", "k", 1800000000);
  const tokenPath = "/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/";
  const expected = createHash("sha256").update(`k${tokenPath}1800000000token_path=${tokenPath}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  assert.equal(
    url,
    `https://vz-x.b-cdn.net/bcdn_token=${expected}&token_path=%2F9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f%2F&expires=1800000000/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/playlist.m3u8`,
  );
  assert.match(url, /\.m3u8$/, "still recognised as HLS");
});

test("Bunny embed token: hex sha256 of key, video id and expiry", () => {
  const url = new URL(signBunnyEmbedUrl("https://iframe.mediadelivery.net/embed/705981/vid-1?autoplay=true", "k", 1800000000));
  assert.equal(url.searchParams.get("token"), createHash("sha256").update("kvid-11800000000").digest("hex"));
  assert.equal(url.searchParams.get("expires"), "1800000000");
  assert.equal(url.searchParams.get("autoplay"), "true");
});

test("the captions relay fetches only caption files from Stoa's own pull zone", () => {
  const host = "vz-eed7c640-e1a.b-cdn.net";
  const ok = (u: string) => allowedCaptionUrl(new URL(u), host);
  assert.equal(ok(`https://${host}/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/captions/en.vtt`), true);
  assert.equal(ok(`https://${host}/bcdn_token=abc&token_path=%2Fx%2F&expires=1/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/captions/en.vtt`), true);
  assert.equal(ok("https://vz-someone-else.b-cdn.net/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/captions/en.vtt"), false, "another library");
  assert.equal(ok(`https://${host}/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/playlist.m3u8`), false, "not a caption file");
  assert.equal(ok(`http://${host}/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/captions/en.vtt`), false);
  assert.equal(allowedCaptionUrl(new URL(`https://${host}/9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f/captions/en.vtt`), undefined), false, "no pull zone configured");
});
