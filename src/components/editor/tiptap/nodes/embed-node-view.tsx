"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ExternalLink, FileText, Link2, MessageSquare, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * embedNode view (A9). A static cited card for an external link (X, YouTube,
 * EDGAR filing, or generic). No live iframe: we render a card that links out.
 * YouTube shows the poster thumbnail (no API needed) with a play affordance.
 */

type EmbedKind = "x" | "youtube" | "edgar" | "link";

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function classify(url: string): EmbedKind {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "twitter.com" || host === "x.com") return "x";
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") return "youtube";
    if (host.endsWith("sec.gov")) return "edgar";
    return "link";
  } catch {
    return "link";
  }
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
    return null;
  } catch {
    return null;
  }
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const KIND_META: Record<EmbedKind, { label: string; icon: typeof Link2 }> = {
  x: { label: "Post on X", icon: MessageSquare },
  youtube: { label: "YouTube", icon: Play },
  edgar: { label: "SEC filing", icon: FileText },
  link: { label: "Link", icon: Link2 },
};

export function EmbedNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const url = String(node.attrs.url ?? "");
  const caption = String(node.attrs.caption ?? "");
  const [draft, setDraft] = useState(url);

  const kind = url ? classify(url) : "link";
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const ytId = kind === "youtube" ? youtubeId(url) : null;

  function commit() {
    const next = draft.trim();
    if (next !== url) updateAttributes({ url: next });
  }

  const card = url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseDown={stop}
      className="group/card flex items-stretch gap-3 focus-ring"
    >
      {kind === "youtube" && ytId && (
        <span className="relative block w-40 shrink-0 overflow-hidden rounded-[var(--radius-btn)] bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
            alt=""
            className="aspect-video h-full w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)]/70 text-[var(--paper)]">
              <Play size={16} fill="currentColor" />
            </span>
          </span>
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1">
        <span className="flex items-center gap-1.5 text-text-mute">
          <Icon size={13} className="shrink-0 text-text-faint" />
          <span className="t-eyebrow">{meta.label}</span>
        </span>
        <span className="truncate text-sm text-text group-hover/card:underline">
          {caption || url}
        </span>
        <span className="num flex items-center gap-1 text-[11px] text-text-faint">
          {hostLabel(url)}
          <ExternalLink size={10} />
        </span>
      </span>
    </a>
  ) : (
    <p className="t-meta">Paste a link to embed it as a cited card</p>
  );

  // Reading mode: the card only.
  if (!isEditable) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        className="fade-up my-4 rounded-[var(--radius-card)] border border-border bg-surface p-3"
      >
        {card}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stop}
      onClick={stop}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-7 flex-1 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2">
          <Link2 size={13} className="text-text-faint" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
            onMouseDown={stop}
            placeholder="Paste an X, YouTube, or SEC link"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </span>
        <button
          type="button"
          aria-label="Delete embed"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="p-3">{card}</div>
      {url && (
        <div className="border-t border-border px-3 py-2">
          <input
            value={caption}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            onMouseDown={stop}
            placeholder="Caption (optional)"
            className="w-full bg-transparent text-sm text-text-mute focus:outline-none"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
