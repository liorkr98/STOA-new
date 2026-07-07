import type { Editor } from "@tiptap/react";

/** Insert a Napkin block after the current selection and auto-generate from it. */
export function insertNapkinFromEditorSelection(editor: Editor): string | null {
  const { from, to } = editor.state.selection;
  if (from === to) return "Select text in your report first, then click Napkin.";
  const selected = editor.state.doc.textBetween(from, to, "\n").trim();
  if (!selected) return "Select text in your report first, then click Napkin.";

  editor
    .chain()
    .focus()
    .setTextSelection(to)
    .insertContent({
      type: "napkinNode",
      attrs: {
        sourceText: selected,
        autoGenerate: true,
      },
    })
    .run();

  return null;
}
