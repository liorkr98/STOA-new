import { ask } from "@/lib/messages";
import { Overlay } from "@/lib/ui/overlay";
import { fontFaces } from "@/lib/ui/styles";
import { PlaybackClock, onWatchChange, readVideo } from "@/lib/youtube/watch";

function addFonts() {
  if (document.getElementById("stoa-extension-fonts")) return;
  const style = document.createElement("style");
  style.id = "stoa-extension-fonts";
  style.textContent = fontFaces((p) => browser.runtime.getURL(`/${p}` as Parameters<typeof browser.runtime.getURL>[0]));
  document.head.append(style);
}

export default defineContentScript({
  matches: ["*://www.youtube.com/*"],
  runAt: "document_idle",
  main(ctx) {
    addFonts();
    let current: string | null = null;
    const clock = new PlaybackClock(() => overlay.tick());
    const overlay = new Overlay(clock);

    async function start(videoId: string) {
      // A video someone has already opened is answered from Stoa's store,
      // without reading its transcript again.
      const known = await ask({ type: "lookup", videoId });
      if (current !== videoId) return;
      let items = known.items;
      let channel: string | null = null;
      if (!items) {
        if (known.error) {
          console.debug(`[stoa] Stoa is not reachable: ${known.error}`);
          return;
        }
        const read = await readVideo(videoId);
        if (current !== videoId) return;
        if (read.kind !== "transcript") {
          console.debug(`[stoa] ${videoId}: skipped (${read.reason})`);
          return;
        }
        channel = read.details.channel;
        const detected = await ask({ type: "detect", videoId, language: read.language, segments: read.segments });
        if (current !== videoId) return;
        if (!detected.items) {
          console.debug(`[stoa] ${videoId}: detection failed (${detected.error ?? "unknown"})`);
          return;
        }
        items = detected.items;
      }
      channel ??= document.querySelector<HTMLElement>("ytd-watch-metadata ytd-channel-name a")?.innerText.trim() || null;
      overlay.load({ videoId, channel }, items);
    }

    const stop = onWatchChange((videoId) => {
      current = videoId;
      overlay.clear();
      clock.stop();
      if (!videoId) return;
      clock.start();
      void start(videoId);
    });
    ctx.onInvalidated(() => {
      stop();
      clock.stop();
      overlay.clear();
    });
  },
});
