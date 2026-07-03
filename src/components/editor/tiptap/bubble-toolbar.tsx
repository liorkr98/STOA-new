"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Code,
  Link2,
  Type,
  Heading2,
  Heading3,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * The floating selection toolbar (docs Compose-Deep-Dive 3.1) -- present only
 * while text is selected, invisible otherwise. This is the de-bombast move:
 * formatting never eats a fixed ribbon. "Mark as opinion" is deferred to
 * Layer 4, where it ties into the fact-check reading layer rather than being
 * a mark with no reading-view meaning.
 */
export function BubbleToolbar({ editor }: { editor: Editor }) {
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
      <Btn icon={Bold} label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn icon={Italic} label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn icon={Code} label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
      <Btn icon={Link2} label="Link" active={editor.isActive("link")} onClick={setLink} />
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
