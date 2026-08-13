/**
 * HTML parse mode over MarkdownV2: recipe text is free-form user content
 * (titles/ingredients can contain `-`, `.`, `(`, `!`, ...), and MarkdownV2
 * treats 18 characters as reserved — escaping all of them correctly is
 * far easier to get wrong than HTML's 3-character escape set.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
