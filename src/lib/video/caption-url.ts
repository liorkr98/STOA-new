/**
 * Whether the captions relay (src/app/api/captions/route.ts) may fetch this
 * URL: a clip's caption file on Stoa's own pull zone, nothing else.
 */
/** `/<guid>/captions/<lang>.vtt`, optionally behind Bunny's path token. */
const CAPTION_PATH = /^(?:\/bcdn_token=[^/]+)?\/[0-9a-f-]{36}\/captions\/[a-z]{2,3}(?:-[A-Za-z]{2})?\.vtt$/;

export function allowedCaptionUrl(url: URL, cdnHostname: string | undefined): boolean {
  const cdn = cdnHostname?.trim();
  if (!cdn || url.protocol !== "https:" || url.hostname !== cdn || url.port) return false;
  return CAPTION_PATH.test(url.pathname);
}
