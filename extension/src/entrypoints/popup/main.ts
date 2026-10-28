import { STOA } from "@/lib/messages";
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

function render(stored: Stored) {
  const rows = weekCounts(stored).slice(0, 8);
  const example = rows.length === 0;
  const list = (example ? EXAMPLE : rows)
    .map((r) => `<li><span class="ticker">${esc(r.ticker)}</span><span class="sides">${sides(r)}</span></li>`)
    .join("");
  const who = stored.session ? `Saving to Stoa as ${esc(stored.session.email ?? "you")}` : "Not signed in. Taps stay on this device until you save them.";
  document.getElementById("app")!.innerHTML = `
    <div class="top"><h1>This week</h1>${example ? `<span class="tag">Example</span>` : ""}</div>
    <ul class="${example ? "example" : ""}" aria-label="${example ? "Example of" : ""} this week's top stocks">${list}</ul>
    ${example ? `<p class="empty">Tap a bull or a bear beside a YouTube video and your week fills up here.</p>` : ""}
    <label class="quiet"><span>Quiet mode</span><input type="checkbox" id="quiet" ${stored.quiet ? "checked" : ""} /></label>
    <p class="hint">No pop-ups. Only the "In this video" line.</p>
    <div class="grow"></div>
    <p class="who">${who}</p>
    <button class="cart" id="cart">Open my cart on Stoa</button>`;
  document.getElementById("quiet")!.addEventListener("change", (e) => void writeStored({ quiet: (e.target as HTMLInputElement).checked }));
  document.getElementById("cart")!.addEventListener("click", () => {
    void browser.tabs.create({ url: `${STOA}/home?cart=open` }).then(() => window.close());
  });
}

void readStored().then(render);
browser.storage.onChanged.addListener(() => void readStored().then(render));
