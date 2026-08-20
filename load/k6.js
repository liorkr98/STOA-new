import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";

/**
 * Stoa load tests (Scale-Hardening Section 4). Read-path scenarios that mirror
 * the traffic most likely to stress the system first: feed pagination, a hot
 * ticker under burst, typeahead search, and a view-event flood.
 *
 * Run against staging: BASE_URL=https://staging.stoamarket.ai k6 run load/k6.js
 */

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const ONLY = __ENV.SCENARIO; // optional: feed | quote | search | trackView
const HOT_TICKER = __ENV.HOT_TICKER || "NVDA";
const HOT_VIDEO_ID = __ENV.HOT_VIDEO_ID || "00000000-0000-0000-0000-000000000000";

const errors = new Rate("stoa_errors");

const allScenarios = {
  feed: {
    executor: "ramping-vus",
    exec: "feed",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 200 },
      { duration: "1m", target: 500 },
      { duration: "30s", target: 0 },
    ],
  },
  quote: {
    executor: "constant-arrival-rate",
    exec: "quote",
    rate: 200,
    timeUnit: "1s",
    duration: "1m",
    preAllocatedVUs: 100,
    maxVUs: 400,
  },
  search: {
    executor: "constant-arrival-rate",
    exec: "search",
    rate: 100,
    timeUnit: "1s",
    duration: "1m",
    preAllocatedVUs: 50,
    maxVUs: 200,
  },
  trackView: {
    executor: "constant-arrival-rate",
    exec: "trackView",
    rate: 300,
    timeUnit: "1s",
    duration: "1m",
    preAllocatedVUs: 100,
    maxVUs: 500,
  },
};

export const options = {
  scenarios: ONLY ? { [ONLY]: allScenarios[ONLY] } : allScenarios,
  thresholds: {
    // Warm-cache targets from the hardening spec.
    http_req_duration: ["p(95)<400"],
    stoa_errors: ["rate<0.001"],
    http_req_failed: ["rate<0.001"],
  },
};

function track(res) {
  const ok = check(res, { "status is 2xx/3xx": (r) => r.status >= 200 && r.status < 400 });
  errors.add(!ok);
}

export function feed() {
  track(http.get(`${BASE_URL}/api/dispatch`));
}

export function quote() {
  track(http.get(`${BASE_URL}/api/market/quote?ticker=${HOT_TICKER}`));
}

export function search() {
  const terms = ["nvda", "app", "marcus", "semi", "tsla"];
  const q = terms[Math.floor(Math.random() * terms.length)];
  track(http.get(`${BASE_URL}/api/search?q=${q}`));
}

export function trackView() {
  const res = http.post(
    `${BASE_URL}/api/videos/${HOT_VIDEO_ID}/track-view`,
    JSON.stringify({ watchedSeconds: 5 }),
    { headers: { "Content-Type": "application/json" } },
  );
  // Rate limiting (429) is a correct response under flood, not an error.
  const ok = check(res, { handled: (r) => r.status < 500 });
  errors.add(!ok);
}
