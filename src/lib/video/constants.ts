/**
 * Client-safe video constants. Kept out of `bunny.ts` (which is server-only) so
 * client components can import the duration cap without pulling in provider code.
 */
export const MAX_VIDEO_DURATION_SECONDS = 90;
