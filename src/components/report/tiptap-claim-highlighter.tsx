"use client";

import { useEffect, useRef } from "react";
import type { FactClaim } from "@/lib/ai/fact-check";
import type { ClaimType } from "@/lib/fact-check/claim-extraction";

type Verdict = "fact" | "unproven" | "opinion" | "contradicted";

const VERDICT_MAP: Record<ClaimType, Verdict> = {
  Fact: "fact",
  "Yahoo-Verified": "fact",
  Unverified: "unproven",
  Opinion: "opinion",
  Misleading: "contradicted",
  "Yahoo-Disputed": "contradicted",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  fact: "var(--verdigris)",
  unproven: "var(--brass)",
  opinion: "var(--plum)",
  contradicted: "var(--rust)",
};

/**
 * Best-effort inline claim underlines for Tiptap SSR/CSR HTML. Walks text
 * nodes under the prose root and wraps the first substring match per claim.
 * Full TipTap mark integration (with offsets) is the durable fix; this
 * restores the trust signal on the reader surface today.
 */
export function TiptapClaimHighlighter({
  claims,
  rootRef,
}: {
  claims: FactClaim[];
  rootRef: React.RefObject<HTMLElement | null>;
}) {
  const done = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || claims.length === 0 || done.current) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.trim()) textNodes.push(node as Text);
      node = walker.nextNode();
    }

    const used = new Set<string>();
    for (const claim of claims) {
      const needle = claim.text?.trim();
      if (!needle || used.has(needle)) continue;
      for (const textNode of textNodes) {
        const hay = textNode.textContent ?? "";
        const idx = hay.indexOf(needle);
        if (idx === -1) continue;
        if (textNode.parentElement?.closest("[data-claim-verdict]")) continue;

        const verdict = VERDICT_MAP[claim.type] ?? "unproven";
        const range = document.createRange();
        range.setStart(textNode, idx);
        range.setEnd(textNode, idx + needle.length);
        const mark = document.createElement("mark");
        mark.dataset.claimVerdict = verdict;
        mark.className =
          "rounded-sm bg-transparent underline decoration-2 underline-offset-2";
        mark.style.textDecorationColor = VERDICT_COLOR[verdict];
        mark.title = claim.type;
        try {
          range.surroundContents(mark);
          used.add(needle);
        } catch {
          // Partial node boundaries (e.g. split across elements) skip quietly.
        }
        break;
      }
    }
    done.current = true;
  }, [claims, rootRef]);

  return null;
}
