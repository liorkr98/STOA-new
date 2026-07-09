"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { FactClaim } from "@/lib/ai/fact-check";
import { ClaimMark } from "@/components/report/fact-check-layer";

/**
 * Mounts interactive ClaimMark popovers into TipTap reader HTML by wrapping
 * the first substring match per claim. Char-offset TipTap marks are the
 * durable fix; this restores keyboard-accessible claim popovers today.
 */
export function TiptapClaimHighlighter({
  claims,
  rootRef,
  isAuthed = false,
  reportId,
}: {
  claims: FactClaim[];
  rootRef: React.RefObject<HTMLElement | null>;
  isAuthed?: boolean;
  reportId?: string;
}) {
  const rootsRef = useRef<Root[]>([]);
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
        if (textNode.parentElement?.closest("[data-claim-host]")) continue;

        const range = document.createRange();
        range.setStart(textNode, idx);
        range.setEnd(textNode, idx + needle.length);

        const host = document.createElement("span");
        host.dataset.claimHost = "true";
        host.className = "inline";
        try {
          range.surroundContents(host);
        } catch {
          continue;
        }

        const reactRoot = createRoot(host);
        rootsRef.current.push(reactRoot);
        reactRoot.render(
          <ClaimMark claim={claim} isAuthed={isAuthed} reportId={reportId}>
            {needle}
          </ClaimMark>,
        );
        used.add(needle);
        break;
      }
    }

    done.current = true;

    return () => {
      for (const r of rootsRef.current) {
        try {
          r.unmount();
        } catch {
          // Host may already be gone on navigation.
        }
      }
      rootsRef.current = [];
      done.current = false;
    };
  }, [claims, rootRef, isAuthed, reportId]);

  return null;
}
