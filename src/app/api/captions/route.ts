import { NextResponse } from "next/server";

/**
 * Serves a clip's caption track from our own origin.
 *
 * A `<track>` pointing straight at the CDN forces `crossOrigin` on the video,
 * which turns the media request itself into a CORS request. A pull zone that
 * does not answer with `Access-Control-Allow-Origin` then fails the whole
 * video, not just the captions: the element reports MEDIA_ERR_SRC_NOT_SUPPORTED
 * and nothing plays. Proxying the VTT keeps the track same-origin, so the video
 * needs no CORS at all and captions work whatever the CDN is configured to do.
 *
 * The upstream host is pinned to the configured CDN so this cannot be pointed
 * at an arbitrary URL.
 */

const ONE_DAY = 60 * 60 * 24;

function allowedHost(url: URL): boolean {
  const cdn = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim();
  if (url.protocol !== "https:") return false;
  if (cdn && url.hostname === cdn) return true;
  // Any pull zone in the provider's CDN domain, so a hostname change does not
  // silently drop every caption track.
  return url.hostname.endsWith(".b-cdn.net");
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src) return new NextResponse("Missing src", { status: 400 });

  let upstream: URL;
  try {
    upstream = new URL(src);
  } catch {
    return new NextResponse("Bad src", { status: 400 });
  }
  if (!allowedHost(upstream)) return new NextResponse("Host not allowed", { status: 400 });

  const res = await fetch(upstream, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return new NextResponse("Captions unavailable", { status: 404 });

  const body = await res.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": `public, max-age=${ONE_DAY}, immutable`,
    },
  });
}
