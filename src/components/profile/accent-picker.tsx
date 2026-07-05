"use client";

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { Check, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accentVars, checkAccent } from "@/lib/profile/accent";
import { FONT_PAIRINGS, type FontPairingId } from "@/lib/profile/fonts";
import { saveStorefrontBranding } from "@/app/actions/profile";

/**
 * Storefront accent picker (B1). A free hue that overrides only --accent on the
 * public profile. Bounded: invalid or low-contrast colors are rejected (WCAG AA
 * vs --paper). Swatches are on-brand deeper hues; the color input is free.
 */

const SWATCHES = ["#2f6e5d", "#5b4b6b", "#a6483c", "#24544a", "#34507a", "#7a3b52"];

export function AccentPicker({
  initialAccent,
  initialFontPairing,
}: {
  initialAccent?: string | null;
  initialFontPairing?: FontPairingId | null;
}) {
  const [value, setValue] = useState(initialAccent ?? "#2f6e5d");
  const [pairing, setPairing] = useState<FontPairingId>(initialFontPairing ?? "ledger");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const check = useMemo(() => checkAccent(value), [value]);
  const previewVars = check.hex ? accentVars(check.hex) : {};

  function save() {
    setSaved(false);
    setError(null);
    if (!check.valid) {
      setError(check.reason ?? "Invalid accent");
      return;
    }
    start(async () => {
      const res = await saveStorefrontBranding({ accent: check.hex, fontPairing: pairing });
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  }

  function reset() {
    setSaved(false);
    setError(null);
    start(async () => {
      await saveStorefrontBranding({ accent: null });
      setValue("#2f6e5d");
      setSaved(true);
    });
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div>
        <h2 className="t-h3">Storefront style</h2>
        <p className="t-meta mt-1">
          A custom accent and font pairing for your public profile. Bounded on purpose: only the
          accent and display face change; low-contrast colors are rejected for readability.
        </p>
      </div>

      <div>
        <span className="t-eyebrow">Font pairing</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FONT_PAIRINGS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPairing(p.id)}
              className={`rounded-[var(--radius-btn)] border px-3 py-2 text-left transition-colors focus-ring ${
                pairing === p.id
                  ? "border-accent bg-accent-weak"
                  : "border-border bg-bg hover:border-border-strong"
              }`}
            >
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="t-meta block text-[11px]">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Use ${s}`}
            onClick={() => setValue(s)}
            className="h-8 w-8 rounded-[var(--radius-btn)] border border-border focus-ring"
            style={{ background: s }}
          />
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        <input
          type="color"
          value={check.hex ?? "#2f6e5d"}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Custom color"
          className="h-8 w-10 cursor-pointer rounded-[var(--radius-btn)] border border-border bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="#2f6e5d or oklch(...)"
          className="num h-8 w-40 rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm focus-ring"
        />
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-3 rounded-[var(--radius-btn)] border border-border bg-bg p-3" style={previewVars as CSSProperties}>
        <button
          type="button"
          className="h-9 rounded-[var(--radius-btn)] bg-accent px-3 text-sm font-semibold text-accent-ink"
        >
          Subscribe
        </button>
        <span className="text-sm font-medium text-accent">Accent link</span>
        <span
          className="rounded-[var(--radius-tag)] px-2 py-0.5 text-[11px]"
          style={{ background: "var(--accent-weak)", color: "var(--accent)" }}
        >
          tag
        </span>
        <span className="num ml-auto text-[11px] text-text-faint">
          contrast {check.contrast.toFixed(1)}:1
        </span>
      </div>

      {!check.valid && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--down)]">
          <AlertTriangle size={14} /> {check.reason}
        </p>
      )}
      {error && <p className="text-sm text-[var(--down)]">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending || !check.valid}>
          {pending ? "Saving..." : "Save accent"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
          <RotateCcw size={14} /> Reset to default
        </Button>
        {saved && !pending && (
          <span className="flex items-center gap-1 text-sm text-[var(--up)]">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
