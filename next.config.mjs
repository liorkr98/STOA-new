import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

// Plain ESM rather than next.config.ts: Next 16 compiles a TypeScript config to
// CommonJS in a .js file, which this package's "type": "module" then refuses to
// load. JSDoc keeps the editor types.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Keep file tracing scoped to this app when other lockfiles exist in parent dirs.
  outputFileTracingRoot: path.join(__dirname),
  // Cloud agents and local tools often open the app at 127.0.0.1 while `next
  // dev` treats localhost as the origin; without this, client chunks 403 and
  // the Feed never hydrates.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /**
   * Next 15+ defaults the client router cache for dynamic pages to 0s, so every
   * click waits on a full server round trip even when you just left that page.
   * Thirty seconds is long enough that Today → Feed → Today feels instant, and
   * short enough that a new publication still shows up on the next click.
   */
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  /**
   * Discover was retired: the Feed is the only video discovery surface and it
   * is called Feed. Links to the old route exist in the wild, so it redirects
   * rather than 404s. Permanent, because it is never coming back.
   */
  async redirects() {
    return [
      { source: "/discover", destination: "/feed", permanent: true },
      // Grading is retired: its explainer and the private track record are gone.
      { source: "/scoring", destination: "/", permanent: true },
      { source: "/how-it-works", destination: "/", permanent: true },
      { source: "/studio/track-record", destination: "/studio", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/icon", destination: "/icon/512" }];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://browser.sentry-cdn.com https://s3.tradingview.com https://www.tradingview.com",
      "style-src 'self' 'unsafe-inline' https://s3.tradingview.com https://www.tradingview.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.b-cdn.net https://iframe.mediadelivery.net https://picsum.photos https://i.pravatar.cc https://api.dicebear.com https://*.tradingview.com https://s3.tradingview.com",
      "font-src 'self' data:",
      "media-src 'self' blob: https://*.b-cdn.net https://iframe.mediadelivery.net",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.b-cdn.net https://video.bunnycdn.com https://iframe.mediadelivery.net https://*.paypal.com https://*.paypalobjects.com https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://*.upstash.io https://qstash.upstash.io https://*.tradingview.com https://s3.tradingview.com",
      "frame-src https://iframe.mediadelivery.net https://*.paypal.com https://*.paypalobjects.com https://www.tradingview.com https://*.tradingview.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    const security = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(self)" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];

    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/:path*", headers: security },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "https", hostname: "iframe.mediadelivery.net" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "stoa-m1",
  project: process.env.SENTRY_PROJECT ?? "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/sentry-tunnel",
  widenClientFileUpload: true,
});
