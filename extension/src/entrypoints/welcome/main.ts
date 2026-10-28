import { STOA } from "@/lib/messages";
import { readStored, writeStored } from "@/lib/store";

/**
 * The first-run screen. Opens once the extension is installed; until the
 * reader presses Agree nothing is read on YouTube and nothing is sent to
 * Stoa. The full version of this text is /legal/extension-privacy on Stoa.
 */
const POINTS: [string, string][] = [
  ["It only works on youtube.com.", "It does nothing on any other site, and it never sees your other tabs."],
  ["It reads the captions of the video you are watching to find stocks.", "Only on a video page, and only the video in front of you."],
  ["Stoa receives the captions text and the video's id.", "Never your browsing history, your YouTube account or what else you watch."],
  ["Your taps are saved to your Stoa cart.", "Each bull or bear you tap goes to your Interest Cart on Stoa, with the video and the moment you tapped."],
  ["You can turn it off in the popup.", "Click the Stoa icon in Chrome's toolbar and switch it off. Removing the extension removes everything it kept."],
];

async function render() {
  const stored = await readStored();
  const app = document.getElementById("app")!;
  const bars = [0.72, 1, 0.58].map((h, i) => `<span style="height:${Math.round(28 * h)}px;opacity:${i === 1 ? 1 : 0.45}"></span>`).join("");
  app.innerHTML = `
    <div class="mark" aria-hidden="true">${bars}</div>
    <h1>Before Stoa starts</h1>
    <p class="deck">Stoa Interest Cart spots the stocks a video is discussing and lets you tap a bull or a bear beside it. Here is exactly what it does.</p>
    <ul>${POINTS.map(([a, b]) => `<li><strong>${a}</strong><span>${b}</span></li>`).join("")}</ul>
    ${
      stored.consentedAt
        ? `<p class="done" role="status">You agreed on ${new Date(stored.consentedAt).toLocaleDateString()}. Open any YouTube video to start.</p>`
        : `<div class="actions"><button class="agree" id="agree">Agree and start</button><button class="later" id="later">Not now</button></div>`
    }
    <p class="small">The full details are on <a href="${STOA}/legal/extension-privacy" target="_blank" rel="noopener">Stoa's extension privacy page</a>.</p>`;
  document.getElementById("agree")?.addEventListener("click", async () => {
    await writeStored({ consentedAt: new Date().toISOString(), enabled: true });
    await render();
  });
  document.getElementById("later")?.addEventListener("click", () => window.close());
}

void render();
