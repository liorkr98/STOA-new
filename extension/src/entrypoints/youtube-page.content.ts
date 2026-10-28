import { directTranscript, videoDetails } from "@/lib/youtube/innertube";
import { PAGE_REQUEST, PAGE_RESPONSE, type PageAnswer, type PageQuestion } from "@/lib/youtube/page-bridge";

/** Runs in YouTube's own world to read ytcfg and the player for the card script. */
export default defineContentScript({
  matches: ["*://www.youtube.com/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    document.addEventListener(PAGE_REQUEST, (e) => {
      let q: PageQuestion;
      try {
        q = JSON.parse(String((e as CustomEvent).detail)) as PageQuestion;
      } catch {
        return;
      }
      const reply = (answer: PageAnswer) =>
        document.dispatchEvent(new CustomEvent(PAGE_RESPONSE, { detail: JSON.stringify(answer) }));
      if (q.kind === "video") {
        const data = videoDetails(q.videoId);
        reply({ id: q.id, ok: Boolean(data), data });
      } else if (q.kind === "transcript") {
        void directTranscript(q.videoId).then((data) => reply({ id: q.id, ok: Boolean(data), data }));
      }
    });
  },
});
