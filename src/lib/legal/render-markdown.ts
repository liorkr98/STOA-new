/** Minimal markdown renderer for counsel-facing docs (headings, lists, paragraphs). */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function renderLegalMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      closeList();
      continue;
    }

    if (line.startsWith("---")) {
      closeList();
      parts.push('<hr class="my-8 border-border" />');
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      parts.push(`<h3 class="t-h3 mt-6 text-text">${inlineFormat(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      parts.push(`<h2 class="t-h2 mt-10 text-text">${inlineFormat(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      parts.push(`<h1 class="t-h1 text-text">${inlineFormat(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("- [ ] ") || line.startsWith("- ")) {
      if (!inList) {
        parts.push('<ul class="t-body mt-2 list-disc space-y-2 pl-5 text-text-mute">');
        inList = true;
      }
      const item = line.replace(/^- \[ \] /, "").replace(/^- /, "");
      parts.push(`<li>${inlineFormat(item)}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p class="t-body mt-2 text-text-mute">${inlineFormat(line)}</p>`);
  }

  closeList();
  return parts.join("\n");
}
