import type { JSONContent } from "@tiptap/core";

/**
 * Server-side Tiptap-JSON to HTML for the report reading view's first paint.
 *
 * Deliberately not schema-driven: importing the real extension set would pull
 * every React node view (and lightweight-charts) into the server graph, which
 * both bloats the bundle and fails the build. This covers the StarterKit text
 * vocabulary plus callout; interactive custom blocks (charts, video, tables)
 * are skipped here and mount when the interactive renderer hydrates over this
 * markup.
 *
 * Everything user-authored is escaped; links survive only with http(s) hrefs.
 */

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

type Mark = { type: string; attrs?: Record<string, unknown> };

function wrapMarks(text: string, marks: Mark[] | undefined): string {
  if (!marks?.length) return text;
  return marks.reduce((html, mark) => {
    switch (mark.type) {
      case "bold":
        return `<strong>${html}</strong>`;
      case "italic":
        return `<em>${html}</em>`;
      case "strike":
        return `<s>${html}</s>`;
      case "code":
        return `<code>${html}</code>`;
      case "highlight":
        return `<mark>${html}</mark>`;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        return href ? `<a href="${esc(href)}" rel="noopener noreferrer">${html}</a>` : html;
      }
      default:
        return html;
    }
  }, text);
}

function children(node: JSONContent): string {
  return (node.content ?? []).map(render).join("");
}

function render(node: JSONContent): string {
  switch (node.type) {
    case "text":
      return wrapMarks(esc(node.text ?? ""), node.marks as Mark[] | undefined);
    case "paragraph":
      return `<p>${children(node)}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 2), 4);
      return `<h${level}>${children(node)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children(node)}</ul>`;
    case "orderedList":
      return `<ol>${children(node)}</ol>`;
    case "listItem":
      return `<li>${children(node)}</li>`;
    case "blockquote":
      return `<blockquote>${children(node)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${children(node)}</code></pre>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "callout":
      return `<div data-callout class="stoa-callout">${children(node)}</div>`;
    default:
      /* Custom interactive blocks (chart, video, valuation, ...) have no
       * meaningful static form: render any text children, otherwise nothing.
       * They mount on hydration. */
      return children(node);
  }
}

export function tiptapStaticHtml(doc: JSONContent): string {
  try {
    return children(doc);
  } catch {
    return "";
  }
}
