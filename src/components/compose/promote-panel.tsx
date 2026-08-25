"use client";

import { Megaphone } from "lucide-react";
import { cn } from "@/lib/design/cn";
import {
  PROMOTED_LABEL,
  UNPRICED_PROMOTE_MODEL,
  type PromoteModel,
  type PromoteState,
} from "@/lib/compose/promote";

/**
 * Promote, on the publish side of the screen because it is a setting applied
 * to the publication rather than something the publication is built from.
 *
 * The cost model is injected, so this renders whatever pricing is decided
 * later without being rewritten, and renders honestly while there is none.
 * The one thing it always states is the standing rule: promoted content is
 * labelled as promoted, wherever it appears.
 */
export function PromotePanel({
  state,
  onChange,
  model = UNPRICED_PROMOTE_MODEL,
  /** Wording changes after publish: the same panel, reached from the item. */
  published = false,
}: {
  state: PromoteState;
  onChange: (s: PromoteState) => void;
  model?: PromoteModel;
  published?: boolean;
}) {
  const on = state.boostOnPublish;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4" aria-label="Promote">
      <p className="t-eyebrow mb-2.5">Promote</p>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) =>
            onChange({
              ...state,
              boostOnPublish: e.target.checked,
              modelId: e.target.checked ? model.id : null,
              optionId: e.target.checked ? state.optionId : null,
            })
          }
          className="mt-0.5 accent-[var(--ink)]"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[0.875rem] font-medium text-text">
            <Megaphone size={14} className="text-text-mute" aria-hidden />
            {published ? "Promote this publication" : "Boost on publish"}
          </span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-mute">
            {published
              ? "Put this in front of more readers from now."
              : "Put this in front of more readers the moment it goes live."}
          </span>
        </span>
      </label>

      {on ? (
        <div className="mt-3">
          {model.options.length > 0 ? (
            <div role="radiogroup" aria-label="Promotion" className="space-y-1.5">
              {model.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={state.optionId === o.id}
                  onClick={() => onChange({ ...state, optionId: o.id, modelId: model.id })}
                  className={cn(
                    "focus-ring flex w-full items-baseline justify-between gap-3 rounded-[var(--radius-btn)] border px-2.5 py-2 text-left",
                    state.optionId === o.id ? "border-[var(--ink)] bg-surface-2" : "border-border hover:border-border-strong",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] text-text">{o.label}</span>
                    {o.detail ? (
                      <span className="block text-[0.75rem] leading-snug text-text-mute">{o.detail}</span>
                    ) : null}
                  </span>
                  <span className="num shrink-0 text-[0.8125rem] text-text">{o.costLabel}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius-btn)] border border-dashed border-border p-2.5 text-[0.8125rem] leading-snug text-text-mute">
              {model.placeholder}
            </p>
          )}
        </div>
      ) : null}

      <p className="num mt-3 border-t border-border pt-2.5 text-[10px] uppercase leading-relaxed tracking-[0.12em] text-text-faint">
        {PROMOTED_LABEL} content is always labelled as {PROMOTED_LABEL.toLowerCase()}, wherever it appears
      </p>
    </section>
  );
}
