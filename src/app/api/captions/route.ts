import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo/site";
import { allowedCaptionUrl } from "@/lib/video/caption-url";

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
 * Only Stoa's own library: the upstream host must be the configured pull zone
 * and the path a clip's caption file, so this cannot be used to fetch anything
 * else from that zone or from any other. The request names Stoa as its
 * referrer, which the pull zone's referrer rule requires.
 */

const ONE_HOUR = 60 * 60;
export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src) return new NextResponse("Missing src", { status: 400 });

  let upstream: URL;
  try {
    upstream = new URL(src);
  } catch {
    return new NextResponse("Bad src", { status: 400 });
  }
  if (!allowedCaptionUrl(upstream, process.env.BUNNY_STREAM_CDN_HOSTNAME)) {
    return new NextResponse("Not a Stoa caption file", { status: 400 });
  }

  const res = await fetch(upstream, { cache: "no-store", headers: { Referer: `${SITE_URL}/` } }).catch(() => null);
  if (!res?.ok) return new NextResponse("Captions unavailable", { status: 404 });

  const body = await res.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": `private, max-age=${ONE_HOUR}`,
    },
  });
}
