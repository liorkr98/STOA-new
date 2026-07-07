const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Basic normalization for untrusted analyst-provided text before prompting. */
export function normalizePromptInput(input: string, maxChars: number): string {
  return input.replace(CONTROL_CHARS_RE, " ").trim().slice(0, maxChars);
}

/**
 * Prevent accidental prompt-tag breakouts when we wrap untrusted text in
 * pseudo-XML markers for instruction/data separation.
 */
export function escapePromptTagContent(input: string): string {
  return input.replace(/<\/(report_text|user_message|context_json)>/gi, "<\\/$1>");
}
