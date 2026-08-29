const CACHE = "stoa-shell-v1";
const OFFLINE = "/offline";

const VIDEO_EXT = /\.(m3u8|m4s|ts|mp4|webm|mpd)$/i;

function bypass(url) {
  if (VIDEO_EXT.test(url.pathname)) return true;
  const host = url.hostname;
  return (
    host.includes("b-cdn.net") ||
    host.includes("mediadelivery.net") ||
    host.includes("bunnycdn.com") ||
    host.includes("iframe.mediadelivery.net")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (bypass(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match(OFFLINE);
        return cached ?? Response.error();
      }),
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
  }
});
