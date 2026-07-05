import { Scale } from "lucide-react";

/**
 * DYOR bar (Phase 4.2) -- a fixed, non-brandable statement shown at the foot of
 * every published report. It is deliberately not free text and takes no theme or
 * color prop: a creator cannot soften, restyle, or remove it. Pair it with
 * DisclosureBlock (conflict-of-interest) to form the reading-view trust footer.
 */
export function DyorBar() {
  return (
    <div className="ledger-card flex items-start gap-3 p-3.5">
      <Scale size={16} className="mt-0.5 shrink-0 text-text-mute" aria-hidden />
      <p className="text-xs leading-relaxed text-text-mute">
        <span className="font-semibold text-text">This is research, not financial advice.</span>{" "}
        Calls lock at publish and are graded by the market; they can be and often are wrong. Do your
        own research and consider your own circumstances before acting.
      </p>
    </div>
  );
}
