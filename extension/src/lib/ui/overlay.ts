import { ask } from "@/lib/messages";
import { cardDue, clock as fmtClock, lineAt } from "@/lib/schedule";
import { heldTickers, readStored, weekCounts, type Stored } from "@/lib/store";
import type { Direction, TickerInfo, VideoTicker, WeekRow } from "@/lib/types";
import { bearSvg, bullSvg } from "@/lib/ui/animals";
import { ARROW, CLOSE, INFO } from "@/lib/ui/icons";
import { esc, move, price } from "@/lib/ui/format";
import { InfoPanel } from "@/lib/ui/panel";
import { CARD_CSS } from "@/lib/ui/styles";
import type { PlaybackClock } from "@/lib/youtube/watch";

/** Untouched for this long while the video plays, a card folds into the line. */
const FOLD_AFTER_S = 8;
/** How long "JPM added · interested · Undo" stays before the buttons return. */
const CONFIRM_MS = 2000;

export type Video = { videoId: string; channel: string | null };

/** The watch page's title and channel as YouTube draws them right now. */
export function pageVideo(): { title: string | null; channel: string | null } {
  const title =
    document.querySelector<HTMLElement>("ytd-watch-metadata #title h1, ytd-watch-metadata h1")?.innerText?.trim() ||
    document.title.replace(/^\(\d+\)\s*/, "").replace(/\s+-\s+YouTube$/, "").trim() ||
    null;
  const channel = document.querySelector<HTMLElement>("ytd-watch-metadata ytd-channel-name a, ytd-video-owner-renderer ytd-channel-name a")?.innerText?.trim() || null;
  return { title, channel };
}

export function confirmWords(direction: Direction): string {
  return direction === "bull" ? "interested" : "cautious";
}

/**
 * Everything drawn beside the video: one card at a time, the "In this video"
 * line under it, and the signed-out "Save to Stoa" card. It lives in a shadow
 * root at the top of YouTube's right-hand column, never over the video, and
 * hides in fullscreen.
 */
export class Overlay {
  private readonly host = document.createElement("div");
  private readonly root: ShadowRoot;
  private readonly el: HTMLDivElement;
  private items: VideoTicker[] = [];
  private video: Video | null = null;
  private active: VideoTicker | null = null;
  private folding = false;
  private untouchedFor = 0;
  private lastTick = 0;
  private touching = false;
  private confirm: { ticker: string; direction: Direction; tapId: string; timer: number } | null = null;
  private readonly shown = new Set<string>();
  private readonly dismissed = new Set<string>();
  private readonly info = new Map<string, TickerInfo | null>();
  private stored: Stored | null = null;
  private counts: WeekRow[] = [];
  private readonly panel: InfoPanel;

  constructor(private readonly clock: PlaybackClock) {
    this.host.id = "stoa-extension";
    this.root = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CARD_CSS;
    this.el = document.createElement("div");
    this.el.className = "root";
    this.el.setAttribute("role", "region");
    this.el.setAttribute("aria-label", "Stoa: stocks in this video");
    this.root.append(style, this.el);
    this.el.addEventListener("click", (e) => this.onClick(e));
    this.el.addEventListener("pointerenter", () => (this.touching = true));
    this.el.addEventListener("pointerleave", () => (this.touching = false));
    this.el.addEventListener("focusin", () => (this.touching = true));
    this.el.addEventListener("focusout", () => (this.touching = false));
    this.panel = new InfoPanel({
      tap: (ticker, direction) => this.tap(ticker, direction),
      undo: (tapId) => this.undo(tapId),
      countFor: (ticker) => this.countFor(ticker),
      itemFor: (ticker) => this.items.find((i) => i.ticker === ticker) ?? null,
    });
    browser.storage.onChanged.addListener(() => void this.refreshStored());
    void this.refreshStored();
  }

  load(video: Video, items: VideoTicker[]) {
    this.video = video;
    this.items = items;
    this.active = null;
    this.shown.clear();
    this.dismissed.clear();
    this.panel.close();
    this.render();
  }

  clear() {
    this.video = null;
    this.items = [];
    this.active = null;
    this.panel.close();
    this.host.remove();
  }

  private async refreshStored() {
    this.stored = await readStored();
    this.counts = weekCounts(this.stored);
    this.render();
    this.panel.refresh();
  }

  private countFor(ticker: string): WeekRow {
    return this.counts.find((r) => r.ticker === ticker) ?? { ticker, bull: 0, bear: 0 };
  }

  /** Called by the clock about four times a second while the page is open. */
  tick() {
    if (!this.video) return;
    this.mount();
    const fullscreen = Boolean(document.fullscreenElement);
    this.host.style.display = fullscreen ? "none" : "";
    const now = performance.now();
    const dt = this.lastTick ? Math.min(1, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    const t = this.clock.time;
    if (t === null || fullscreen) return;

    const due = cardDue(this.items, t, { shown: this.shown, dismissed: this.dismissed, quiet: Boolean(this.stored?.quiet) });
    if (due && due.ticker !== this.active?.ticker) this.open(due);

    if (this.active && !this.touching && !this.confirm && this.clock.playing && !this.panel.isOpenFor(this.active.ticker)) {
      this.untouchedFor += dt;
      if (this.untouchedFor >= FOLD_AFTER_S) this.fold();
    }
    this.renderLine();
  }

  private open(item: VideoTicker) {
    this.shown.add(item.ticker);
    this.active = item;
    this.untouchedFor = 0;
    this.folding = false;
    this.render();
    if (!this.info.has(item.ticker)) {
      void ask({ type: "info", ticker: item.ticker }).then((info) => {
        this.info.set(item.ticker, info);
        if (this.active?.ticker === item.ticker) this.render();
      });
    }
  }

  private fold() {
    const card = this.el.querySelector(".card");
    if (!card || this.folding) {
      this.active = null;
      this.render();
      return;
    }
    this.folding = true;
    card.classList.add("leaving");
    window.setTimeout(() => {
      this.folding = false;
      this.active = null;
      this.render();
    }, 200);
  }

  private mount() {
    if (this.host.isConnected) return;
    const column = document.querySelector("ytd-watch-flexy #secondary-inner") ?? document.querySelector("ytd-watch-flexy #secondary");
    if (column) column.prepend(this.host);
  }

  private async tap(ticker: string, direction: Direction): Promise<string> {
    // Title and channel are read from the page at the moment of the tap.
    const page = pageVideo();
    const { tapId } = await ask({
      type: "tap",
      ticker,
      direction,
      videoId: this.video?.videoId ?? null,
      videoChannel: page.channel ?? this.video?.channel ?? null,
      videoTitle: page.title,
      videoSeconds: this.clock.time,
    });
    return tapId;
  }

  private async undo(tapId: string) {
    await ask({ type: "undo", tapId });
  }

  private onClick(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!target) return;
    const act = target.dataset.act;
    const ticker = target.dataset.ticker ?? this.active?.ticker ?? "";
    this.untouchedFor = 0;
    if (act === "close" && this.active) {
      this.dismissed.add(this.active.ticker);
      this.active = null;
      this.render();
    } else if (act === "bull" || act === "bear") {
      const direction = act;
      void this.tap(ticker, direction).then((tapId) => {
        if (this.confirm) window.clearTimeout(this.confirm.timer);
        const timer = window.setTimeout(() => {
          this.confirm = null;
          this.render();
        }, CONFIRM_MS);
        this.confirm = { ticker, direction, tapId, timer };
        this.render();
      });
    } else if (act === "undo" && this.confirm) {
      window.clearTimeout(this.confirm.timer);
      void this.undo(this.confirm.tapId);
      this.confirm = null;
      this.render();
    } else if (act === "info") {
      this.panel.open(ticker, this.info.get(ticker) ?? null);
    } else if (act === "stoa") {
      void ask({ type: "open", path: `/markets/${encodeURIComponent(ticker)}` });
    } else if (act === "chip") {
      const item = this.items.find((i) => i.ticker === ticker);
      if (item) this.open(item);
    } else if (act === "save") {
      void ask({ type: "open", path: "/sign-up?next=%2Fhome" });
    }
  }

  private tapButtons(ticker: string): string {
    const c = this.countFor(ticker);
    if (this.confirm?.ticker === ticker) {
      return `<div class="confirm" role="status"><span>${esc(ticker)} added · ${confirmWords(this.confirm.direction)}</span><button data-act="undo">Undo</button></div>`;
    }
    return `<div class="taps">
      <button class="tap bull" data-act="bull" data-ticker="${esc(ticker)}" aria-label="Add a bull tap for ${esc(ticker)}. ${c.bull} this week">${bullSvg(18)}<span>${c.bull}</span></button>
      <button class="tap bear" data-act="bear" data-ticker="${esc(ticker)}" aria-label="Add a bear tap for ${esc(ticker)}. ${c.bear} this week">${bearSvg(18)}<span>${c.bear}</span></button>
      <button class="square info" data-act="info" data-ticker="${esc(ticker)}" aria-label="More about ${esc(ticker)}">${INFO}</button>
      <button class="square open" data-act="stoa" data-ticker="${esc(ticker)}" aria-label="Open ${esc(ticker)} on Stoa">${ARROW}</button>
    </div>`;
  }

  private cardHtml(item: VideoTicker): string {
    const info = this.info.get(item.ticker);
    const name = info?.name ?? item.name;
    const what = item.what ?? info?.industry ?? "";
    const m = move(info?.changePercent ?? null);
    const bits = [
      what ? esc(what) : "",
      info?.price != null ? `<span class="price">${price(info.price)}</span>${m ? ` <span class="num ${m.tone}">${m.text}</span>` : ""}` : "",
    ].filter(Boolean);
    return `<section class="card" aria-label="${esc(item.ticker)} ${esc(name)}">
      <div class="head">
        <span class="ticker">${esc(item.ticker)}</span>
        <span class="name">${esc(name)}</span>
        ${item.etf ? `<span class="etf">ETF</span>` : ""}
        <span class="spacer"></span>
        <span class="when" title="Discussed from ${fmtClock(item.start)}">${fmtClock(item.start)}</span>
        <button class="close" data-act="close" aria-label="Close the ${esc(item.ticker)} card">${CLOSE}</button>
      </div>
      <div class="what">${bits.join(" · ")}</div>
      ${this.tapButtons(item.ticker)}
    </section>`;
  }

  private lineHtml(): string {
    const t = this.clock.time ?? 0;
    const { reached, ahead } = lineAt(this.items, t, this.shown);
    if (reached.length === 0) return "";
    const theme = document.documentElement.hasAttribute("dark") ? "dark" : "light";
    const chips = reached
      .map((i) => `<button class="chip${this.active?.ticker === i.ticker ? " on" : ""}" data-act="chip" data-ticker="${esc(i.ticker)}" aria-label="Show ${esc(i.ticker)}">${esc(i.ticker)}</button>`)
      .join("");
    return `<div class="line ${theme}"><span class="label">In this video</span>${chips}${ahead ? `<span class="ahead">+${ahead} ahead</span>` : ""}</div>`;
  }

  private saveHtml(): string {
    if (!this.stored || this.stored.session) return "";
    const n = heldTickers(this.stored.taps).length;
    if (n === 0) return "";
    return `<div class="save"><span>${n} ${n === 1 ? "stock" : "stocks"} picked</span><button data-act="save">Save to Stoa</button></div>`;
  }

  private lineCache = "";

  private renderLine() {
    const html = this.lineHtml();
    if (html === this.lineCache) return;
    this.lineCache = html;
    const slot = this.el.querySelector(".line-slot");
    if (slot) slot.innerHTML = html;
  }

  private render() {
    if (!this.video) return;
    if (this.folding) return;
    const focused = (this.root.activeElement as HTMLElement | null)?.dataset.act;
    this.lineCache = this.lineHtml();
    this.el.innerHTML = `${this.active ? this.cardHtml(this.active) : ""}<div class="line-slot">${this.lineCache}</div>${this.saveHtml()}`;
    if (focused) this.el.querySelector<HTMLElement>(`[data-act="${focused}"]`)?.focus();
  }
}
