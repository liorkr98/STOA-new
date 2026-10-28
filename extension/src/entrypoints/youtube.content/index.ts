import { PlaybackClock, onWatchChange, readVideo } from "@/lib/youtube/watch";

export default defineContentScript({
  matches: ["*://www.youtube.com/*"],
  runAt: "document_idle",
  main(ctx) {
    let current: string | null = null;
    const clock = new PlaybackClock(() => undefined);
    const stop = onWatchChange((videoId) => {
      current = videoId;
      clock.stop();
      if (!videoId) return;
      clock.start();
      void readVideo(videoId).then((read) => {
        if (current !== videoId) return;
        if (read.kind === "transcript") {
          console.debug(`[stoa] ${videoId}: ${read.segments.length} transcript lines (${read.language})`);
        } else {
          console.debug(`[stoa] ${videoId}: skipped (${read.reason})`);
        }
      });
    });
    ctx.onInvalidated(() => {
      stop();
      clock.stop();
    });
  },
});
