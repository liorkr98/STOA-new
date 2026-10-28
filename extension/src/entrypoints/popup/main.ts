import { STOA, type TabStatus } from "@/lib/messages";
import { readStored, weekCounts, writeStored, type Stored } from "@/lib/store";
import type { WeekRow } from "@/lib/types";
import { bearSvg, bullSvg } from "@/lib/ui/animals";
import { esc } from "@/lib/ui/format";

/** Shown, greyed, until the reader has taps of their own this week. */
const EXAMPLE: WeekRow[] = [
  { ticker: "NVDA", bull: 12, bear: 0 },
  { ticker: "AVAV", bull: 8, bear: 0 },
  { ticker: "AAPL", bull: 6, bear: 0 },
  { ticker: "AAOI", bull: 0, bear: 2 },
];

/** The cart row's layout: the side with more taps large, the other small and quiet; a tie draws both large. */
function sides(r: WeekRow): string {
  const bull = (major: boolean) => `<span class="side${major ? "" : " minor"}" aria-label="${r.bull} bull">${bullSvg(major ? 18 : 14)}${r.bull}</span>`;
  const bear = (major: boolean) => `<span class="side${major ? "" : " minor"}" aria-label="${r.bear} bear">${bearSvg(major ? 18 : 14)}${r.bear}</span>`;
  if (r.bear === 0) return bull(true);
  if (r.bull === 0) return bear(true);
  if (r.bull === r.bear) return bull(true) + bear(true);
  return r.bull > r.bear ? bull(true) + bear(false) : bear(true) + bull(false);
}

let here: TabStatus | null = null;

/** One quiet line about the video in the current tab, only on a YouTube video. */
function videoLine(): string {
  if (!here?.videoId) return "";
  if (here.state === "reading") return `<p class="here">Looking for stocks in this video…</p>`;
  if (here.state === "none") return `<p class="here">No stocks detected in this video</p>`;
  return `<p class="here">${here.count} ${here.count === 1 ? "stock" : "stocks"} in this video</p>`;
}

function renderSetup() {
  document.getElementById("app")!.innerHTML = `
    <div class="top"><h1>Stoa Interest Cart</h1></div>
    <p class="empty">Before it starts, Stoa needs your OK: one screen on what it reads and what it sends.</p>
    <div class="grow"></div>
    <button class="cart" id="setup">Review and agree</button>`;
  document.getElementById("setup")!.addEventListener("click", () => {
    void browser.tabs.create({ url: browser.runtime.getURL("/welcome.html") }).then(() => window.close());
  });
}

function render(stored: Stored) {
  if (!stored.consentedAt) return renderSetup();
  const rows = weekCounts(stored).slice(0, 8);
  const example = rows.length === 0;
  const list = (example ? EXAMPLE : rows)
    .map((r) => `<li><span class="ticker">${esc(r.ticker)}</span><span class="sides">${sides(r)}</span></li>`)
    .join("");
  const who = stored.session
    ? `Saving to Stoa as ${esc(stored.session.email ?? "you")} · <button class="link" id="signout">Sign out</button>`
    : "Not signed in. Taps stay on this device until you save them.";
  document.getElementById("app")!.innerHTML = `
    ${stored.enabled ? videoLine() : ""}
    <div class="top"><h1>This week</h1>${example ? `<span class="tag">Example</span>` : ""}</div>
    <ul class="${example ? "example" : ""}" aria-label="${example ? "Example of" : ""} this week's top stocks">${list}</ul>
    ${example ? `<p class="empty">Tap a bull or a bear beside a YouTube video and your week fills up here.</p>` : ""}
    <label class="quiet"><span>On YouTube</span><input type="checkbox" role="switch" id="enabled" ${stored.enabled ? "checked" : ""} /></label>
    <p class="hint">Off: nothing is read or shown on YouTube.</p>
    <label class="quiet"><span>Quiet mode</span><input type="checkbox" id="quiet" ${stored.quiet ? "checked" : ""} ${stored.enabled ? "" : "disabled"} /></label>
    <p class="hint">No pop-ups. Only the "In this video" line. Alt+Shift+Q</p>
    <div class="grow"></div>
    <p class="who">${who}</p>
    <button class="cart" id="cart">Open my cart on Stoa</button>`;
  document.getElementById("enabled")!.addEventListener("change", (e) => void writeStored({ enabled: (e.target as HTMLInputElement).checked }));
  document.getElementById("quiet")!.addEventListener("change", (e) => void writeStored({ quiet: (e.target as HTMLInputElement).checked }));
  document.getElementById("signout")?.addEventListener("click", () => void browser.runtime.sendMessage({ type: "signout" }));
  document.getElementById("cart")!.addEventListener("click", () => {
    void browser.tabs.create({ url: `${STOA}/home?cart=open` }).then(() => window.close());
  });
}

async function load() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  here = tab?.id !== undefined ? ((await browser.runtime.sendMessage({ type: "tabStatus", tabId: tab.id })) as TabStatus | null) : null;
  render(await readStored());
}

void load();
browser.storage.onChanged.addListener(() => void readStored().then(render));
