"use client";

import { Lock, Check, Minus, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/design/cn";
import { TickerChart } from "@/components/feed/ticker-chart";
import { CardChart } from "@/components/compose/card-chart";
import type { FeedCard, InkValue, ProvenanceInk } from "@/lib/feed/types";

/**
 * Evidence cards in the editorial paper styling. Every value carries its
 * provenance: plain text is the creator's view, CREATOR EST. is the creator's
 * own number, AUTO is an imported market fact. A locked card is sealed
 * (blurred with a lock mark) rather than skipped; tapping it jumps to the
 * unlock card.
 */

export function InkTag({ ink }: { ink: ProvenanceInk }) {
  if (ink === "plain") return null;
  return (
    <span
      className={cn(
        "num ml-1.5 inline-block rounded-[var(--radius-tag)] border px-1 py-px align-middle text-[10px] uppercase tracking-[0.12em]",
        ink === "auto" ? "border-border text-text-faint" : "border-[var(--brass)] text-[var(--brass)]",
      )}
    >
      {ink === "auto" ? "Auto" : "Creator est."}
    </span>
  );
}

function Ink({ v, className }: { v: InkValue; className?: string }) {
  return (
    <span className={className}>
      {v.text}
      <InkTag ink={v.ink} />
    </span>
  );
}

function CardHead({ label }: { label: string }) {
  return <div className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">{label}</div>;
}

function CardFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 md:p-6", className)}>
      {children}
    </div>
  );
}

function CardBody({ card, ticker }: { card: FeedCard; ticker?: string | null }) {
  switch (card.kind) {
    case "thesis":
      return (
        <CardFrame>
          <CardHead label="The case" />
          <h3 className="user-copy mt-2 font-display text-[1.25rem] font-semibold leading-[1.2] tracking-tight" dir="auto">{card.title}</h3>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-mute">{card.body}</p>
        </CardFrame>
      );
    case "edge":
      return (
        <CardFrame>
          <CardHead label="The edge" />
          <div className="mt-3 grid flex-1 grid-cols-2 divide-x divide-[var(--border)]">
            <div className="pr-4">
              <div className="num border-b border-border pb-1.5 text-[10px] uppercase tracking-[0.16em] text-text-faint">The Street says</div>
              <ul className="mt-2 flex flex-col gap-2 text-[0.9375rem] leading-snug text-text-mute">
                {card.street.map((v, i) => (
                  <li key={i}>
                    <Ink v={v} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="pl-4">
              <div className="num border-b border-[var(--ink)] pb-1.5 text-[10px] uppercase tracking-[0.16em] text-text">I say</div>
              <ul className="mt-2 flex flex-col gap-2 font-display text-[1rem] leading-snug text-text">
                {card.mine.map((v, i) => (
                  <li key={i}>
                    <Ink v={v} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardFrame>
      );
    case "path_to_target":
      return (
        <CardFrame>
          <CardHead label="Path to target" />
          <dl className="num mt-4 flex flex-1 flex-col justify-center gap-2 text-[0.9375rem]">
            {card.steps.map((s, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 border-b border-dotted border-[var(--border)] pb-2">
                <dt className="text-text-mute">{s.label}</dt>
                <dd className="text-text">
                  <Ink v={s.value} />
                </dd>
              </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[var(--ink)] pt-3 font-display text-[1.25rem] font-semibold">
              <dt>= Target</dt>
              <dd>
                <Ink v={card.result} />
              </dd>
            </div>
          </dl>
        </CardFrame>
      );
    case "kill_switch":
      return (
        <CardFrame>
          <CardHead label="The kill switch" />
          <div className="mt-4 flex flex-1 flex-col justify-center">
            <div className="rounded-[var(--radius-btn)] border border-[var(--ink)] p-4">
              <div className="font-display text-[1.125rem] font-semibold tracking-tight">I&apos;m wrong if</div>
              <ul className="mt-2.5 flex flex-col gap-2 text-[0.9375rem] leading-snug text-text-mute">
                {card.conditions.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-[var(--rust)]">—</span>
                    <Ink v={c} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardFrame>
      );
    case "catalyst_timeline":
      return (
        <CardFrame>
          <CardHead label="Catalyst timeline" />
          <ol className="mt-4 flex flex-1 flex-col justify-center gap-4">
            {card.events.map((e, i) => (
              <li key={i} className={cn("flex items-start gap-3", e.past ? "text-text-faint" : "text-text")}>
                <span
                  aria-hidden
                  className={cn("mt-1.5 h-2 w-2 flex-none rounded-full border", e.past ? "border-border bg-transparent" : "border-[var(--ink)] bg-[var(--ink)]")}
                />
                <div>
                  <div className="num text-[10px] uppercase tracking-[0.14em]">
                    {new Date(e.dateISO).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                    {e.past ? " · PAST" : ""}
                  </div>
                  <div className="mt-0.5 font-display text-[1rem] font-semibold leading-snug tracking-tight">{e.label}</div>
                </div>
              </li>
            ))}
          </ol>
        </CardFrame>
      );
    case "checklist":
      return (
        <CardFrame>
          <CardHead label="Checklist" />
          <ul className="num mt-4 flex flex-1 flex-col justify-center gap-2 text-[0.8125rem]">
            {card.rows.map((r, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-dotted border-[var(--border)] pb-2">
                <span
                  aria-label={r.status}
                  className={cn(
                    "inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border",
                    r.status === "done" && "border-[var(--verdigris)] text-[var(--verdigris)]",
                    r.status === "failed" && "border-[var(--rust)] text-[var(--rust)]",
                    r.status === "pending" && "border-border text-text-faint",
                  )}
                >
                  {r.status === "done" ? <Check size={10} strokeWidth={2.2} /> : r.status === "failed" ? <X size={10} strokeWidth={2.2} /> : <Minus size={10} strokeWidth={2.2} />}
                </span>
                <span className="text-text">
                  {r.label}
                  <InkTag ink={r.ink} />
                </span>
              </li>
            ))}
          </ul>
        </CardFrame>
      );
    case "figure":
      return (
        <CardFrame>
          <CardHead label={card.caption} />
          <div className="relative mt-3 flex-1 overflow-hidden rounded-[var(--radius-btn)] border border-border bg-surface-2">
            {card.imageUrl ? (
              <Image src={card.imageUrl} alt={card.caption} fill sizes="480px" className="object-contain" />
            ) : ticker ? (
              <div className="absolute inset-0 p-3">
                <TickerChart ticker={ticker} caption={card.caption} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">Figure not available</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-right">
            <span
              className={cn(
                "num inline-block rounded-[var(--radius-tag)] border px-1 py-px text-[10px] uppercase tracking-[0.12em]",
                card.source === "auto" ? "border-border text-text-faint" : "border-[var(--brass)] text-[var(--brass)]",
              )}
            >
              {card.source === "auto" ? "Auto" : "Creator chart"}
            </span>
          </div>
        </CardFrame>
      );
    case "chart":
      return (
        <CardFrame>
          <CardHead label={card.caption || "The tape"} />
          <div className="mt-3 min-h-0 flex-1">
            <CardChart ticker={card.ticker} engine={card.engine} caption={card.caption} />
          </div>
        </CardFrame>
      );
    case "steelman":
      return (
        <CardFrame>
          <CardHead label="The steelman" />
          <div className="mt-3 flex flex-1 flex-col justify-center gap-4">
            <div className="rounded-[var(--radius-btn)] bg-surface-2 p-4">
              <div className="num text-[10px] uppercase tracking-[0.16em] text-text-faint">The counterpoint</div>
              <p className="mt-1.5 font-display text-[1rem] italic leading-snug text-text-mute">&ldquo;{card.objection}&rdquo;</p>
            </div>
            <div>
              <div className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">The counter-counterpoint</div>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text">{card.answer}</p>
            </div>
          </div>
          <p className="num mt-4 border-t border-border pt-3 text-[10px] uppercase tracking-[0.14em] text-text-faint">
            The analyst chose to be challenged and answered on the record.
          </p>
        </CardFrame>
      );
    case "unlock":
      return (
        <CardFrame className="items-center justify-center text-center">
          <Lock size={20} strokeWidth={1.4} className="text-text-mute" aria-hidden />
          <h3 className="mt-3 font-display text-[1.25rem] font-semibold leading-tight tracking-tight">
            {card.access === "free" ? "Read the full publication" : "Unlock the full stack"}
          </h3>
          <p className="mt-2 max-w-[28ch] text-[0.875rem] text-text-mute">
            {card.access === "subscribers"
              ? "Members of this analyst see every card and the written thesis."
              : card.access === "paid"
                ? "One-time unlock for every card and the written thesis."
                : "The thesis, the call and the disclosure, on the report page."}
          </p>
          <span className="mt-4 inline-flex rounded-[var(--radius-btn)] bg-[var(--ink)] px-4 py-2 text-[0.875rem] font-medium text-[var(--paper)]">
            {card.access === "paid" && card.price ? `Unlock · ${card.price}` : card.access === "subscribers" ? "Become a member" : "Open the report"}
          </span>
        </CardFrame>
      );
  }
}

/** Sealed: blurred content and a lock mark. Never skipped. */
export function FeedCardView({
  card,
  ticker,
  onSealedTap,
}: {
  card: FeedCard;
  ticker?: string | null;
  onSealedTap?: () => void;
}) {
  if (card.kind !== "unlock" && card.locked) {
    return (
      <button
        type="button"
        onClick={onSealedTap}
        className="focus-ring relative block h-full w-full text-left"
        aria-label="Locked card. Opens the unlock card."
      >
        <div aria-hidden className="pointer-events-none h-full select-none blur-[6px]">
          <CardBody card={card} ticker={ticker} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--paper)_35%,transparent)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ink)] bg-surface">
            <Lock size={14} strokeWidth={1.6} />
          </span>
          <span className="num text-[10px] uppercase tracking-[0.16em] text-text">Sealed · tap to unlock</span>
        </div>
      </button>
    );
  }
  return <CardBody card={card} ticker={ticker} />;
}
