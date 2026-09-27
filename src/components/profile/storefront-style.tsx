"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { FONT_PAIRINGS, type FontPairingId } from "@/lib/profile/fonts";
import { saveStorefrontBranding } from "@/app/actions/profile";

/**
 * The two things an analyst can change about how their storefront looks: the
 * face its headlines are set in, and a faint paper texture behind it. Colour
 * is not one of them: coral, green and red mean the same thing on every page.
 */
export function StorefrontStyle({
  initialFontPairing,
  initialTexture,
}: {
  initialFontPairing?: FontPairingId | null;
  initialTexture?: boolean;
}) {
  const [pairing, setPairing] = useState<FontPairingId>(initialFontPairing ?? "ledger");
  const [texture, setTexture] = useState<boolean>(initialTexture ?? false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setSaved(false);
    setError(null);
    start(async () => {
      const res = await saveStorefrontBranding({ fontPairing: pairing, texture });
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div>
        <h2 className="t-title">Headline face</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {FONT_PAIRINGS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPairing(p.id)}
              aria-pressed={pairing === p.id}
              className={cn(
                "rounded-inner border px-3 py-2 text-left transition-colors focus-ring",
                pairing === p.id ? "border-[var(--ink)] bg-surface-2" : "border-border bg-bg hover:border-border-strong",
              )}
            >
              <span className="block text-body font-medium">{p.label}</span>
              <span className="t-meta block">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-body text-text">
        <input type="checkbox" checked={texture} onChange={(e) => setTexture(e.target.checked)} />
        A faint paper texture behind your storefront
      </label>

      {error ? <p className="text-body text-[var(--error)]">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save style"}
        </Button>
        {saved && !pending ? (
          <span className="flex items-center gap-1 text-body text-text-mute">
            <Check size={14} aria-hidden /> Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
