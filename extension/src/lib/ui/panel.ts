import { ask } from "@/lib/messages";
import type { Direction, TickerInfo, VideoTicker, WeekRow } from "@/lib/types";
import { bearSvg, bullSvg } from "@/lib/ui/animals";
import { ARROW, CLOSE } from "@/lib/ui/icons";
import { bigMoney, day, esc, move, price, sparkPath } from "@/lib/ui/format";
import { PANEL_CSS } from "@/lib/ui/styles";

type PanelHooks = {
  tap: (ticker: string, direction: Direction) => Promise<string>;
  undo: (tapId: string) => Promise<void>;
  countFor: (ticker: string) => WeekRow;
  itemFor: (ticker: string) => VideoTicker | null;
};

function stanceWords(item: VideoTicker | null): string {
  if (!item?.stance) return "";
  const side = item.stance === "bull" ? "bullish" : "bearish";
  return `In this video the speaker is ${side}${item.conditional ? ", on a condition" : ""}.`;
}

/**
 * More info: a narrow panel over the right of the page with a light dim
 * behind it. The video keeps playing underneath. Escape, the cross or a
 * click on the dim closes it.
 */
export class InfoPanel {
  private host: HTMLDivElement | null = null;
  private ticker: string | null = null;
  private info: TickerInfo | null = null;
  private confirm: { direction: Direction; tapId: string; timer: number } | null = null;
  private returnFocus: HTMLElement | null = null;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.host) {
      e.stopPropagation();
      this.close();
    }
  };

  constructor(private readonly hooks: PanelHooks) {}

  isOpenFor(ticker: string): boolean {
    return this.ticker === ticker && Boolean(this.host);
  }

  open(ticker: string, known: TickerInfo | null) {
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.ticker = ticker;
    this.info = known;
    if (!this.host) {
      this.host = document.createElement("div");
      this.host.id = "stoa-extension-panel";
      const root = this.host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = PANEL_CSS;
      const mountPoint = document.createElement("div");
      root.append(style, mountPoint);
      root.addEventListener("click", (e) => this.onClick(e as MouseEvent));
      document.body.append(this.host);
      document.addEventListener("keydown", this.onKey, true);
    }
    this.render();
    this.host.shadowRoot?.querySelector<HTMLElement>(".x")?.focus();
    void ask({ type: "info", ticker }).then((fresh) => {
      if (this.ticker !== ticker || !fresh) return;
      this.info = fresh;
      this.render();
    });
  }

  close() {
    if (!this.host) return;
    if (this.confirm) window.clearTimeout(this.confirm.timer);
    this.confirm = null;
    document.removeEventListener("keydown", this.onKey, true);
    this.host.remove();
    this.host = null;
    this.ticker = null;
    this.returnFocus?.focus?.();
  }

  refresh() {
    if (this.host) this.render();
  }

  private onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el || !this.ticker) return;
    const ticker = this.ticker;
    const act = el.dataset.act;
    if (act === "close") this.close();
    else if (act === "bull" || act === "bear") {
      const direction = act;
      void this.hooks.tap(ticker, direction).then((tapId) => {
        if (this.confirm) window.clearTimeout(this.confirm.timer);
        const timer = window.setTimeout(() => {
          this.confirm = null;
          this.refresh();
        }, 2000);
        this.confirm = { direction, tapId, timer };
        this.refresh();
      });
    } else if (act === "undo" && this.confirm) {
      window.clearTimeout(this.confirm.timer);
      void this.hooks.undo(this.confirm.tapId);
      this.confirm = null;
      this.refresh();
    } else if (act === "stoa") void ask({ type: "open", path: `/markets/${encodeURIComponent(ticker)}` });
    else if (act === "coverage") void ask({ type: "open", path: `/markets/${encodeURIComponent(ticker)}#coverage` });
  }

  private render() {
    const mountPoint = this.host?.shadowRoot?.querySelector("style + div");
    if (!mountPoint || !this.ticker) return;
    const t = this.ticker;
    const i = this.info;
    const item = this.hooks.itemFor(t);
    const c = this.hooks.countFor(t);
    const m = move(i?.changePercent ?? null);
    const closes = i?.closes ?? [];
    const trend = closes.length > 1 ? (closes[closes.length - 1]! >= closes[0]! ? "var(--gain-text)" : "var(--loss-text)") : "var(--mute)";
    const sub = [i?.name ?? item?.name ?? "", i?.industry ?? ""].filter(Boolean).map(esc).join(" · ");
    const range = i?.low52 != null && i?.high52 != null ? `${price(i.low52)} – ${price(i.high52)}` : "–";
    const analysts = i?.analysts ?? 0;
    const taps = this.confirm
      ? `<div class="confirm" role="status"><span>${esc(t)} added · ${this.confirm.direction === "bull" ? "interested" : "cautious"}</span><button data-act="undo">Undo</button></div>`
      : `<button class="tap bull" data-act="bull" aria-label="Add a bull tap for ${esc(t)}. ${c.bull} this week">${bullSvg(18)}<span>${c.bull}</span></button>
         <button class="tap bear" data-act="bear" aria-label="Add a bear tap for ${esc(t)}. ${c.bear} this week">${bearSvg(18)}<span>${c.bear}</span></button>
         <button class="go" data-act="stoa">Open on Stoa ${ARROW}</button>`;
    mountPoint.innerHTML = `
      <div class="dim" data-act="close"></div>
      <aside class="panel" role="dialog" aria-modal="false" aria-label="${esc(t)}, more information">
        <div class="scroll">
          <div class="top">
            <div>
              <div class="big">${esc(t)}${i?.etf || item?.etf ? ` <span class="etf">ETF</span>` : ""}</div>
              <div class="sub">${sub}</div>
            </div>
            <button class="x" data-act="close" aria-label="Close">${CLOSE}</button>
          </div>
          <div class="quote"><span class="px">${i?.price != null ? price(i.price) : "–"}</span>${m ? `<span class="chg ${m.tone}">${m.text} today</span>` : ""}</div>
          <div class="chart">${closes.length > 1 ? `<svg viewBox="0 0 360 88" preserveAspectRatio="none" role="img" aria-label="Three-month price line"><path d="${sparkPath(closes)}" fill="none" stroke="${trend}" stroke-width="1.75" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>` : ""}</div>
          ${i?.description ? `<p class="about">${esc(i.description)}</p>` : ""}
          ${stanceWords(item) ? `<p class="stance">${esc(stanceWords(item))}</p>` : ""}
          <dl class="facts">
            <div><dt>Market cap</dt><dd>${bigMoney(i?.marketCap ?? null)}</dd></div>
            <div><dt>P/E</dt><dd>${i?.pe != null ? i.pe.toFixed(1) : "–"}</dd></div>
            <div><dt>52-week range</dt><dd>${range}</dd></div>
            <div><dt>Next earnings</dt><dd>${day(i?.nextEarnings ?? null)}</dd></div>
          </dl>
          <button class="cover" data-act="coverage">${analysts > 0 ? `${analysts} Stoa ${analysts === 1 ? "analyst covers" : "analysts cover"} ${esc(t)} →` : `See ${esc(t)} on Stoa →`}</button>
        </div>
        <div class="foot">${taps}</div>
      </aside>`;
  }
}
