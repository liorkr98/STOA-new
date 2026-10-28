import { ask } from "@/lib/messages";
import { active, readStored } from "@/lib/store";
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

    const report = (videoId: string | null, state: "reading" | "found" | "none", count = 0) =>
      void ask({ type: "status", videoId, state, count }).catch(() => undefined);

    // Anything that goes wrong (no captions, Stoa unreachable, detection
    // refused) draws nothing on the page: the card simply never appears, and
    // only the toolbar popup says no stocks were detected.
    async function start(videoId: string) {
      report(videoId, "reading");
      // A video someone has already opened is answered from Stoa's store,
      // without reading its transcript again.
      const known = await ask({ type: "lookup", videoId });
      if (current !== videoId) return;
      let items = known.items;
      let channel: string | null = null;
      if (!items) {
        if (known.error) {
          console.debug(`[stoa] Stoa is not reachable: ${known.error}`);
          report(videoId, "none");
          return;
        }
        // Signed out, nothing new is read: Stoa only answers signed-in readers.
        if (!(await readStored()).session) {
          report(videoId, "none");
          return;
        }
        const read = await readVideo(videoId);
        if (current !== videoId) return;
        if (read.kind !== "transcript") {
          console.debug(`[stoa] ${videoId}: skipped (${read.reason})`);
          if (read.reason !== "left") report(videoId, "none");
          return;
        }
        channel = read.details.channel;
        const detected = await ask({ type: "detect", videoId, language: read.language, segments: read.segments });
        if (current !== videoId) return;
        if (!detected.items) {
          console.debug(`[stoa] ${videoId}: detection failed (${detected.error ?? "unknown"})`);
          report(videoId, "none");
          return;
        }
        items = detected.items;
      }
      channel ??= document.querySelector<HTMLElement>("ytd-watch-metadata ytd-channel-name a")?.innerText.trim() || null;
      overlay.load({ videoId, channel }, items);
      report(videoId, items.length ? "found" : "none", new Set(items.map((i) => i.ticker)).size);
    }

    // Nothing is read or sent before the reader agrees, or while the
    // extension is switched off in the popup.
    let on = false;
    const begin = (videoId: string | null) => {
      current = videoId;
      overlay.clear();
      clock.stop();
      if (!on) return;
      if (!videoId) {
        report(null, "none");
        return;
      }
      clock.start();
      void start(videoId);
    };
    let stop = () => undefined as void;
    void readStored().then((stored) => {
      on = active(stored);
      stop = onWatchChange(begin);
    });
    browser.storage.onChanged.addListener((changes) => {
      if (!("consentedAt" in changes) && !("enabled" in changes)) return;
      void readStored().then((stored) => {
        const now = active(stored);
        if (now === on) return;
        on = now;
        begin(current);
      });
    });
    ctx.onInvalidated(() => {
      stop();
      clock.stop();
      overlay.clear();
    });
  },
});
