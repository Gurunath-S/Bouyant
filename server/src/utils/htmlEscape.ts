/**
 * Safely escapes characters for embedding untrusted text into HTML context.
 * Prevents HTML injection, script execution, and tag breakout.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  const str = String(input);
  const matchHtmlRegExp = /["'&<>]/;
  if (!matchHtmlRegExp.test(str)) {
    return str;
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
