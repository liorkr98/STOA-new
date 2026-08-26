"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { InkTag } from "@/components/feed/feed-cards";
import { CardChart } from "@/components/compose/card-chart";
import { cardName, cardSummary, type DraftCard } from "@/lib/compose/cards";
import type { InkValue, ProvenanceInk } from "@/lib/feed/types";

/**
 * One card, drawn small. The same component renders the figure in the research
 * body and the overlay on the video, because a card that reads one way in the
 * prose and another over the picture is two cards as far as the reader is
 * concerned. Provenance is per value, exactly as the player shows it.
 */

function Row({ v }: { v: InkValue }) {
  return (
    <li className="text-[0.8125rem] leading-snug text-text">
      {v.text || <span className="text-text-faint">Empty</span>}
      <InkTag ink={v.ink} />
    </li>
  );
}

function inks(v: unknown): InkValue[] {
  return Array.isArray(v) ? (v as InkValue[]) : [];
}

function Body({ card }: { card: DraftCard }) {
  const p = card.payload;
  switch (card.kind) {
    case "thesis":
      return (
        <p className="text-[0.8125rem] leading-snug text-text">
          {String(p.body ?? "") || <span className="text-text-faint">No claim written yet</span>}
        </p>
      );
    case "edge":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="num text-[10px] uppercase tracking-[0.16em] text-text-faint">Street</div>
            <ul className="mt-1 space-y-1">{inks(p.street).map((v, i) => <Row key={i} v={v} />)}</ul>
          </div>
          <div>
            <div className="num text-[10px] uppercase tracking-[0.16em] text-text-faint">Mine</div>
            <ul className="mt-1 space-y-1">{inks(p.mine).map((v, i) => <Row key={i} v={v} />)}</ul>
          </div>
        </div>
      );
    case "path_to_target": {
      const steps = (Array.isArray(p.steps) ? p.steps : []) as { label: string; value: InkValue }[];
      const result = p.result as InkValue | undefined;
      return (
        <div>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li key={i} className="flex justify-between gap-3 text-[0.8125rem] leading-snug">
                <span className="text-text-mute">{s.label}</span>
                <span className="num text-text">
                  {s.value?.text}
                  <InkTag ink={s.value?.ink ?? "plain"} />
                </span>
              </li>
            ))}
          </ol>
          {result?.text ? (
            <p className="num mt-2 border-t border-border pt-2 text-[0.8125rem] text-text">
              {result.text}
              <InkTag ink={result.ink} />
            </p>
          ) : null}
        </div>
      );
    }
    case "kill_switch":
      return <ul className="space-y-1">{inks(p.conditions).map((v, i) => <Row key={i} v={v} />)}</ul>;
    case "catalyst_timeline": {
      const events = (Array.isArray(p.events) ? p.events : []) as { dateISO: string; label: string; past: boolean }[];
      return (
        <ul className="space-y-1">
          {events.map((e, i) => (
            <li key={i} className="flex gap-2 text-[0.8125rem] leading-snug">
              <span className={cn("num shrink-0", e.past ? "text-text-faint" : "text-text")}>{e.dateISO}</span>
              <span className="text-text-mute">{e.label}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "checklist": {
      const rows = (Array.isArray(p.rows) ? p.rows : []) as { label: string; status: string; ink: ProvenanceInk }[];
      return (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={i} className="flex items-baseline gap-2 text-[0.8125rem] leading-snug">
              <span className="num text-text-faint">{r.status === "done" ? "OK" : r.status === "failed" ? "NO" : "..."}</span>
              <span className="text-text">
                {r.label}
                <InkTag ink={r.ink} />
              </span>
            </li>
          ))}
        </ul>
      );
    }
    case "figure":
      return p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(p.imageUrl)} alt={String(p.caption ?? "")} className="max-h-40 w-full rounded-[4px] object-contain" />
      ) : (
        <p className="text-[0.8125rem] text-text-faint">No image yet</p>
      );
    case "chart":
      return (
        <CardChart
          ticker={String(p.ticker ?? "")}
          engine={p.engine === "tradingview" ? "tradingview" : "yahoo"}
          caption={String(p.caption ?? "")}
          compact
        />
      );
    case "steelman":
      return (
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] leading-snug text-text-mute">{String(p.objection ?? "")}</p>
          <p className="text-[0.8125rem] leading-snug text-text">{String(p.answer ?? "")}</p>
        </div>
      );
    case "unlock":
      return <p className="text-[0.8125rem] text-text-mute">{cardSummary(card)}</p>;
  }
}

export function CardPreview({
  card,
  className,
  compact = false,
}: {
  card: DraftCard;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">{cardName(card)}</span>
        {card.locked ? (
          <span className="num flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-text-faint">
            <Lock size={10} aria-hidden /> Locked
          </span>
        ) : null}
      </div>
      <div className="mt-2">
        <Body card={card} />
      </div>
    </div>
  );
}
