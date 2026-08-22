import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";

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
 * Losing the optimiser costs little here. Bunny already returns a sized JPEG
 * from a CDN, which is most of what the optimiser would have done.
 *
 * The other way to fix this is on the Bunny side, by allowing the no-referrer
 * case on the pull zone. That is a deliberate security setting and not ours to
 * flip, so this component does not depend on it.
 */
export function ClipThumb({
  src,
  seed,
  className = "",
  loading = "lazy",
}: {
  src: string | null;
  /** The analyst's id, so the fallback is their colour on every surface. */
  seed: string | null | undefined;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  if (!src) return <PlaceholderThumb seed={seed} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={loading}
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
