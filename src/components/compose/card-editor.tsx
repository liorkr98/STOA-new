"use client";

import { useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2, Lock, LockOpen, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { cardName, kindSpec, type DraftCard } from "@/lib/compose/cards";
import type { InkValue, ProvenanceInk } from "@/lib/feed/types";

/**
 * Editing one card.
 *
 * The three inks are the point of this screen, so they are enforced here
 * rather than described: a value the creator typed can be their view (plain)
 * or their own number (CREATOR EST.) and they switch between the two freely.
 * AUTO is an imported market fact, so it is read-only and carries no switch;
 * the only way a value becomes AUTO is by being imported, and the only way it
 * stops being AUTO is by being deleted and retyped. That is what makes the
 * tag worth anything to a reader.
 */

function InkSwitch({ value, onChange }: { value: ProvenanceInk; onChange: (i: ProvenanceInk) => void }) {
  if (value === "auto") {
    return (
      <span className="num shrink-0 rounded-[var(--radius-tag)] border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-text-faint">
        Auto
      </span>
    );
  }
  return (
    <div className="flex shrink-0 rounded-[4px] border border-border" role="radiogroup" aria-label="Provenance">
      {(["plain", "creator_est"] as const).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          className={cn(
            "num px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] focus-ring first:rounded-l-[3px] last:rounded-r-[3px]",
            value === i
              ? i === "creator_est"
                ? "bg-[var(--brass)] text-[var(--paper)]"
                : "bg-[var(--ink)] text-[var(--paper)]"
              : "text-text-mute hover:text-text",
          )}
        >
          {i === "plain" ? "View" : "Est."}
        </button>
      ))}
    </div>
  );
}

function InkField({
  value,
  placeholder,
  onChange,
  onRemove,
}: {
  value: InkValue;
  placeholder: string;
  onChange: (v: InkValue) => void;
  onRemove?: () => void;
}) {
  const isAuto = value.ink === "auto";
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value.text}
        readOnly={isAuto}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        aria-label={isAuto ? `${value.text} (imported market data, not editable)` : placeholder}
        className={cn(
          "min-w-0 flex-1 rounded-[4px] border border-border px-2 py-1 text-[0.8125rem] text-text focus-ring",
          isAuto ? "bg-surface-2 text-text-mute" : "bg-bg",
        )}
      />
      <InkSwitch value={value.ink} onChange={(ink) => onChange({ ...value, ink })} />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this line"
          className="focus-ring rounded p-1 text-text-faint hover:text-[var(--rust)]"
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  );
}

function AddLine({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="num focus-ring mt-1.5 flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.14em] text-text-mute hover:text-text"
    >
      <Plus size={11} /> {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="num mb-1 text-[10px] uppercase tracking-[0.16em] text-text-faint">{label}</div>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-[4px] border border-border bg-bg px-2 py-1.5 text-[0.8125rem] text-text focus-ring";

export function CardEditor({
  card,
  onChange,
  onDelete,
}: {
  card: DraftCard;
  onChange: (card: DraftCard) => void;
  onDelete: () => void;
}) {
  const p = card.payload;
  const set = useCallback(
    (patch: Record<string, unknown>) => onChange({ ...card, payload: { ...card.payload, ...patch } }),
    [card, onChange],
  );

  const list = (key: string): InkValue[] => (Array.isArray(p[key]) ? (p[key] as InkValue[]) : []);
  const setList = (key: string, next: InkValue[]) => set({ [key]: next });
  const editList = (key: string, i: number, v: InkValue) =>
    setList(key, list(key).map((x, j) => (j === i ? v : x)));
  const addTo = (key: string) => setList(key, [...list(key), { text: "", ink: "plain" }]);
  const removeFrom = (key: string, i: number) => setList(key, list(key).filter((_, j) => j !== i));

  const inkList = (key: string, placeholder: string) => (
    <>
      {list(key).map((v, i) => (
        <div key={i} className="mt-1.5 first:mt-0">
          <InkField
            value={v}
            placeholder={placeholder}
            onChange={(next) => editList(key, i, next)}
            onRemove={() => removeFrom(key, i)}
          />
        </div>
      ))}
      <AddLine label="Add a line" onClick={() => addTo(key)} />
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">
            {kindSpec(card.kind)?.label ?? cardName(card)}
          </p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-text-mute">{kindSpec(card.kind)?.blurb}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...card, locked: !card.locked })}
          aria-pressed={card.locked}
          className={cn(
            "num focus-ring flex items-center gap-1.5 rounded-[var(--radius-btn)] border px-2 py-1 text-[10px] uppercase tracking-[0.12em]",
            card.locked ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-border text-text-mute hover:text-text",
          )}
        >
          {card.locked ? <Lock size={11} /> : <LockOpen size={11} />}
          {card.locked ? "Locked" : "Free"}
        </button>
      </div>

      {card.kind === "thesis" ? (
        <>
          <Field label="Title">
            <input
              value={String(p.title ?? "")}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="What you are claiming"
              className={inputClass}
            />
          </Field>
          <Field label="The claim">
            <textarea
              value={String(p.body ?? "")}
              onChange={(e) => set({ body: e.target.value })}
              rows={5}
              placeholder="Say it in a paragraph"
              className={cn(inputClass, "resize-y leading-snug")}
            />
          </Field>
        </>
      ) : null}

      {card.kind === "edge" ? (
        <>
          <Field label="What the street says">{inkList("street", "The consensus line")}</Field>
          <Field label="What you say">{inkList("mine", "Your line")}</Field>
        </>
      ) : null}

      {card.kind === "path_to_target" ? (
        <>
          <Field label="Steps">
            {((p.steps as { label: string; value: InkValue }[] | undefined) ?? []).map((s, i) => (
              <div key={i} className="mt-1.5 flex items-center gap-1.5 first:mt-0">
                <input
                  value={s.label}
                  placeholder="What moves"
                  onChange={(e) =>
                    set({
                      steps: ((p.steps as { label: string; value: InkValue }[]) ?? []).map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  className="min-w-0 flex-1 rounded-[4px] border border-border bg-bg px-2 py-1 text-[0.8125rem] text-text focus-ring"
                />
                <div className="min-w-0 flex-1">
                  <InkField
                    value={s.value}
                    placeholder="By how much"
                    onChange={(v) =>
                      set({
                        steps: ((p.steps as { label: string; value: InkValue }[]) ?? []).map((x, j) =>
                          j === i ? { ...x, value: v } : x,
                        ),
                      })
                    }
                    onRemove={() =>
                      set({ steps: ((p.steps as unknown[]) ?? []).filter((_, j) => j !== i) })
                    }
                  />
                </div>
              </div>
            ))}
            <AddLine
              label="Add a step"
              onClick={() =>
                set({
                  steps: [
                    ...((p.steps as unknown[]) ?? []),
                    { label: "", value: { text: "", ink: "creator_est" } },
                  ],
                })
              }
            />
          </Field>
          <Field label="Which gets you to">
            <InkField
              value={(p.result as InkValue) ?? { text: "", ink: "creator_est" }}
              placeholder="The target"
              onChange={(v) => set({ result: v })}
            />
          </Field>
        </>
      ) : null}

      {card.kind === "kill_switch" ? (
        <Field label="What would prove you wrong">{inkList("conditions", "If this happens, you are wrong")}</Field>
      ) : null}

      {card.kind === "catalyst_timeline" ? (
        <Field label="Dates that decide it">
          {((p.events as { dateISO: string; label: string; past: boolean }[] | undefined) ?? []).map((e, i) => {
            const events = (p.events as { dateISO: string; label: string; past: boolean }[]) ?? [];
            const edit = (patch: Partial<(typeof events)[number]>) =>
              set({ events: events.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="mt-1.5 flex items-center gap-1.5 first:mt-0">
                <input
                  type="date"
                  value={e.dateISO}
                  onChange={(ev) => edit({ dateISO: ev.target.value })}
                  aria-label="Date"
                  className="num shrink-0 rounded-[4px] border border-border bg-bg px-2 py-1 text-[0.8125rem] text-text focus-ring"
                />
                <input
                  value={e.label}
                  placeholder="What happens"
                  onChange={(ev) => edit({ label: ev.target.value })}
                  className="min-w-0 flex-1 rounded-[4px] border border-border bg-bg px-2 py-1 text-[0.8125rem] text-text focus-ring"
                />
                <label className="num flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-text-mute">
                  <input type="checkbox" checked={e.past} onChange={(ev) => edit({ past: ev.target.checked })} />
                  Past
                </label>
                <button
                  type="button"
                  onClick={() => set({ events: events.filter((_, j) => j !== i) })}
                  aria-label="Remove this date"
                  className="focus-ring rounded p-1 text-text-faint hover:text-[var(--rust)]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          <AddLine
            label="Add a date"
            onClick={() =>
              set({ events: [...((p.events as unknown[]) ?? []), { dateISO: "", label: "", past: false }] })
            }
          />
        </Field>
      ) : null}

      {card.kind === "checklist" ? (
        <Field label="What you checked">
          {((p.rows as { label: string; status: string; ink: ProvenanceInk }[] | undefined) ?? []).map((r, i) => {
            const rows = (p.rows as { label: string; status: string; ink: ProvenanceInk }[]) ?? [];
            const edit = (patch: Partial<(typeof rows)[number]>) =>
              set({ rows: rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="mt-1.5 flex items-center gap-1.5 first:mt-0">
                <input
                  value={r.label}
                  placeholder="The check"
                  onChange={(ev) => edit({ label: ev.target.value })}
                  className="min-w-0 flex-1 rounded-[4px] border border-border bg-bg px-2 py-1 text-[0.8125rem] text-text focus-ring"
                />
                <select
                  value={r.status}
                  onChange={(ev) => edit({ status: ev.target.value })}
                  aria-label="Result"
                  className="num shrink-0 rounded-[4px] border border-border bg-bg px-1.5 py-1 text-[10px] uppercase tracking-[0.1em] text-text focus-ring"
                >
                  <option value="done">Held</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
                <InkSwitch value={r.ink} onChange={(ink) => edit({ ink })} />
                <button
                  type="button"
                  onClick={() => set({ rows: rows.filter((_, j) => j !== i) })}
                  aria-label="Remove this check"
                  className="focus-ring rounded p-1 text-text-faint hover:text-[var(--rust)]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          <AddLine
            label="Add a check"
            onClick={() => set({ rows: [...((p.rows as unknown[]) ?? []), { label: "", status: "pending", ink: "plain" }] })}
          />
        </Field>
      ) : null}

      {card.kind === "figure" ? (
        <>
          <Field label="Caption">
            <input
              value={String(p.caption ?? "")}
              onChange={(e) => set({ caption: e.target.value })}
              placeholder="What the reader is looking at"
              className={inputClass}
            />
          </Field>
          <Field label="Image">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) set({ imageUrl: URL.createObjectURL(f), source: "creator" });
              }}
              className="text-[0.8125rem] text-text-mute file:mr-2 file:rounded-[4px] file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-[0.8125rem] file:text-text"
            />
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={String(p.imageUrl)} alt="" className="mt-2 max-h-32 rounded-[4px] border border-border object-contain" />
            ) : null}
          </Field>
        </>
      ) : null}

      {card.kind === "chart" ? (
        <>
          <Field label="Ticker">
            <input
              value={String(p.ticker ?? "")}
              onChange={(e) => set({ ticker: e.target.value.toUpperCase() })}
              placeholder="NVDA"
              className={cn(inputClass, "num")}
            />
          </Field>
          <Field label="Source">
            <div className="flex gap-1" role="radiogroup" aria-label="Chart source">
              {(["yahoo", "tradingview"] as const).map((eng) => (
                <button
                  key={eng}
                  type="button"
                  role="radio"
                  aria-checked={p.engine === eng}
                  onClick={() => set({ engine: eng })}
                  className={cn(
                    "rounded-[var(--radius-btn)] border px-2 py-1.5 text-[11px] focus-ring",
                    p.engine === eng
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                      : "border-border text-text-mute hover:text-text",
                  )}
                >
                  {eng === "yahoo" ? "Yahoo Finance" : "TradingView"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Caption">
            <input
              value={String(p.caption ?? "")}
              onChange={(e) => set({ caption: e.target.value })}
              placeholder="What the tape is showing"
              className={inputClass}
            />
          </Field>
        </>
      ) : null}

      {card.kind === "steelman" ? (
        <>
          <Field label="The best case against you">
            <textarea
              value={String(p.objection ?? "")}
              onChange={(e) => set({ objection: e.target.value })}
              rows={3}
              placeholder="Put it as well as they would"
              className={cn(inputClass, "resize-y leading-snug")}
            />
          </Field>
          <Field label="Your answer">
            <textarea
              value={String(p.answer ?? "")}
              onChange={(e) => set({ answer: e.target.value })}
              rows={3}
              placeholder="Answer it"
              className={cn(inputClass, "resize-y leading-snug")}
            />
          </Field>
        </>
      ) : null}

      {card.kind === "unlock" ? (
        <p className="text-[0.8125rem] leading-snug text-text-mute">
          The call to action. It is always last and always free, because it is what sells the rest.
          Its price comes from Access when you publish.
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="num text-[10px] uppercase leading-relaxed tracking-[0.12em] text-text-faint">
          Est. is your number · Auto is imported and cannot be edited
        </p>
        {card.kind === "unlock" ? null : (
          <Button variant="secondary" size="sm" onClick={onDelete}>
            <Trash2 size={13} /> Delete card
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The editor as a dialog. The rail is 248px wide, which is right for a tray
 * and wrong for editing a card with two columns of values in it, so editing
 * takes the middle of the screen at every width.
 */
export function CardEditorDialog({
  card,
  onChange,
  onDelete,
  onClose,
}: {
  card: DraftCard | null;
  onChange: (card: DraftCard) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={Boolean(card)} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="scroll-area fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-[1.375rem] font-semibold tracking-tight">
              {card ? cardName(card) : "Card"}
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="focus-ring rounded-[4px] p-1 text-text-mute hover:text-text">
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Edit this card</Dialog.Description>
          <div className="mt-4">
            {card ? <CardEditor card={card} onChange={onChange} onDelete={onDelete} /> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
