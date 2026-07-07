"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import * as Popover from "@radix-ui/react-popover";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  Link2,
  Type,
  Heading2,
  Heading3,
  Quote,
  PilcrowRight,
  PilcrowLeft,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/design/cn";
import { VisualizeSelectionMenu } from "@/components/editor/tiptap/visualize-selection-menu";

// Three highlight tints, six-token only, all at 15% (Phase 1.2).
const TINTS: { key: string; label: string; color: string }[] = [
  { key: "verdigris", label: "Verdigris", color: "color-mix(in srgb, var(--verdigris) 15%, transparent)" },
  { key: "brass", label: "Brass", color: "color-mix(in srgb, var(--brass) 15%, transparent)" },
  { key: "plum", label: "Plum", color: "color-mix(in srgb, var(--plum) 15%, transparent)" },
];

/**
 * The floating selection toolbar (docs Compose-Deep-Dive 3.1) -- present only
 * while text is selected. Marks in spec order: turn-into, then bold, italic,
 * underline, strikethrough, highlight, link, code, RTL/LTR, mark-as-opinion.
 * Shortcuts (B/I/U/Shift+S from StarterKit, Shift+H from Highlight) show in
 * tooltips.
 */
export function BubbleToolbar({ editor, reportTicker }: { editor: Editor; reportTicker?: string }) {
  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const blockDir = (editor.state.selection.$from.node(1)?.attrs?.dir as string) ?? "auto";
  const isRtl = blockDir === "rtl";

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: e, from, to }) => from !== to && e.isEditable && !e.isActive("codeBlock")}
      className="flex items-center gap-0.5 rounded-[var(--r-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
    >
      <Btn icon={Type} label="Text" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} />
      <Btn icon={Heading2} label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn icon={Heading3} label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <Btn icon={Quote} label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Divider />
      <VisualizeSelectionMenu editor={editor} reportTicker={reportTicker} />
      <Divider />
      <Btn icon={Bold} label="Bold (Cmd+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn icon={Italic} label="Italic (Cmd+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn icon={Underline} label="Underline (Cmd+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <Btn icon={Strikethrough} label="Strikethrough (Cmd+Shift+S)" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Highlight"
            title="Highlight (Cmd+Shift+H)"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] transition-colors focus-ring",
              editor.isActive("highlight") ? "bg-accent-weak text-accent" : "text-text-mute hover:bg-surface-2 hover:text-text",
            )}
          >
            <Highlighter size={15} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            className="popover-content z-50 flex items-center gap-1.5 rounded-[var(--r-card)] border border-border bg-surface p-2 shadow-[var(--shadow-card)]"
          >
            {TINTS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-label={`Highlight ${t.label}`}
                title={t.label}
                onClick={() => editor.chain().focus().toggleHighlight({ color: t.color }).run()}
                className="h-6 w-6 rounded-[var(--radius-btn)] border border-border focus-ring"
                style={{ background: t.color }}
              />
            ))}
            <span className="mx-0.5 h-5 w-px bg-border" />
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="rounded-[var(--radius-btn)] px-2 py-1 text-xs text-text-mute transition-colors hover:bg-surface-2 hover:text-text focus-ring"
            >
              None
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Btn icon={Link2} label="Link" active={editor.isActive("link")} onClick={setLink} />
      <Btn icon={Code} label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
      <Divider />
      <Btn
        icon={isRtl ? PilcrowLeft : PilcrowRight}
        label={isRtl ? "Left-to-right" : "Right-to-left"}
        active={isRtl}
        onClick={() => editor.chain().focus().setBlockDir(isRtl ? "ltr" : "rtl").run()}
      />
      <Btn
        icon={MessageCircle}
        label="Mark as opinion"
        active={editor.isActive("opinion")}
        onClick={() => editor.chain().focus().toggleOpinion().run()}
      />
    </BubbleMenu>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;
}

function Btn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] transition-colors focus-ring",
        active ? "bg-accent-weak text-accent" : "text-text-mute hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon size={15} />
    </button>
  );
}
