"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Shapes, ArrowLeft } from "lucide-react";
import { CARD_INTENTS, LIBRARY_KINDS, sampleCard, type CardKindSpec } from "@/lib/compose/cards";
import type { CardKind } from "@/lib/feed/card-schema";
import { CardPreview } from "@/components/compose/card-preview";

function KindButton({
  spec,
  onPick,
  showShape,
}: {
  spec: CardKindSpec;
  onPick: (k: CardKind) => void;
  showShape?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(spec.kind)}
      className="focus-ring flex w-full flex-col items-start rounded-[var(--radius-btn)] border border-border bg-bg p-3 text-left transition-colors hover:border-[var(--ink)]"
    >
      <span className="font-display text-[0.9375rem] font-semibold tracking-tight text-text">
        {showShape ? spec.shape : spec.label}
      </span>
      <span className="mt-0.5 text-[0.8125rem] leading-snug text-text-mute">
        {showShape ? spec.label : spec.blurb}
      </span>
    </button>
  );
}

export function CardLibrary({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (kind: CardKind) => void;
}) {
  const [byShape, setByShape] = useState(false);
  const [previewKind, setPreviewKind] = useState<CardKind | null>(null);

  function reset() {
    setByShape(false);
    setPreviewKind(null);
  }

  function addThisKind(kind: CardKind) {
    onPick(kind);
    onOpenChange(false);
    reset();
  }

  const previewSpec = previewKind ? LIBRARY_KINDS.find((s) => s.kind === previewKind) : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" />
        <Dialog.Content className="scroll-area fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-[1.375rem] font-semibold tracking-tight">
                {previewSpec ? previewSpec.label : byShape ? "Pick a format" : "Add a card"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[0.8125rem] text-text-mute">
                {previewSpec
                  ? "This is how the card reads. You can fill it after you add it."
                  : byShape
                    ? "The same cards, listed by the shape they take."
                    : "Cards belong to the publication. Preview one before you add it."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="focus-ring rounded-[4px] p-1 text-text-mute hover:text-text"
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          {previewKind && previewSpec ? (
            <>
              <div className="mt-4">
                <CardPreview card={sampleCard(previewKind)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => addThisKind(previewKind)}
                  className="focus-ring rounded-[var(--radius-btn)] border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-[13px] font-medium text-[var(--paper)]"
                >
                  Use this card
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewKind(null)}
                  className="num focus-ring flex items-center gap-1.5 rounded text-[10px] uppercase tracking-[0.14em] text-text-mute hover:text-text"
                >
                  <ArrowLeft size={12} /> Back
                </button>
              </div>
            </>
          ) : byShape ? (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {LIBRARY_KINDS.map((spec) => (
                  <KindButton key={spec.kind} spec={spec} onPick={setPreviewKind} showShape />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setByShape(false)}
                className="num focus-ring mt-4 flex items-center gap-1.5 rounded text-[10px] uppercase tracking-[0.14em] text-text-mute hover:text-text"
              >
                <ArrowLeft size={12} /> Back to intents
              </button>
            </>
          ) : (
            <>
              {CARD_INTENTS.map((intent) => (
                <section key={intent.key} className="mt-5">
                  <h3 className="t-eyebrow">{intent.label}</h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {intent.kinds.map((spec) => (
                      <KindButton key={spec.kind} spec={spec} onPick={setPreviewKind} />
                    ))}
                  </div>
                </section>
              ))}

              <button
                type="button"
                onClick={() => setByShape(true)}
                className="focus-ring mt-5 flex w-full items-center gap-3 rounded-[var(--radius-btn)] border border-dashed border-border p-3 text-left transition-colors hover:border-[var(--ink)]"
              >
                <Shapes size={16} className="shrink-0 text-text-mute" aria-hidden />
                <span>
                  <span className="block font-display text-[0.9375rem] font-semibold tracking-tight">Custom</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-mute">
                    Pick a format instead: statement, two columns, steps, timeline, image.
                  </span>
                </span>
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
