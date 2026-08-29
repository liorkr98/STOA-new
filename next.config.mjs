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
    return [{ source: "/discover", destination: "/feed", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
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
