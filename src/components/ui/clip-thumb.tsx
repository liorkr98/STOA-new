"use client";

import { useState } from "react";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { isDeadMediaUrl } from "@/lib/video/direct";

/**
 * A video clip's poster frame, or the analyst's generated stand-in when there
 * is not one yet.
 *
 * Deliberately a plain `<img>` rather than `next/image`. The Bunny pull zone
 * refuses requests that arrive with no `Referer`, and Next's image optimiser
 * fetches the file from our own server, where there is no referring page to
 * send: every Bunny thumbnail came back 403 and every tile rendered as a black
 * rectangle. A browser-issued `<img>` sends the origin as its referrer and is
 * served normally.
 *
 * If the URL is a known-dead Bunny object, or the image fails to load, we
 * fall back to the analyst colour stand-in rather than a broken icon.
 */
export function ClipThumb({
  src,
  seed,
  className = "",
  loading = "lazy",
}: {
  src: string | null;
  seed: string | null | undefined;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const usable = src && !isDeadMediaUrl(src) ? src : null;
  const [failed, setFailed] = useState(false);
  if (!usable || failed) return <PlaceholderThumb seed={seed} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={usable}
      alt=""
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
