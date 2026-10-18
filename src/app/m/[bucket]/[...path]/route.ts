import { NextResponse } from "next/server";
import { isPrivateBucket, isSafeObjectPath } from "@/lib/media/storage-url";
import { signMediaUrls } from "@/lib/media/sign";

/**
 * A stored image from a private bucket (report images, chart snapshots, demo
 * posters), answered with a redirect to a short-lived signed link. Report
 * bodies and cards keep the object's public-form URL as its identifier and
 * draw it through `mediaSrc` (src/lib/media/storage-url.ts), so nothing saved
 * has to change and a link handed to a reader stops working within hours.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path: segments } = await params;
  const path = segments.join("/");
  if (!isPrivateBucket(bucket) || !isSafeObjectPath(path)) return new NextResponse("Not found", { status: 404 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const stored = `${base}/storage/v1/object/public/${bucket}/${segments.map(encodeURIComponent).join("/")}`;
  const signed = (await signMediaUrls([stored]))(stored);
  if (!signed) return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(signed, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=600" },
  });
}
