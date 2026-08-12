import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import {
  MAX_TELEGRAM_MESSAGE_LENGTH,
  TRUNCATION_SUFFIX,
} from '../bot.constants';

/**
 * HTML parse mode over MarkdownV2: recipe text is free-form user content
 * (titles/ingredients can contain `-`, `.`, `(`, `!`, ...), and MarkdownV2
 * treats 18 characters as reserved — escaping all of them correctly is
 * far easier to get wrong than HTML's 3-character escape set.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatDraftPreview(draft: RecipeDraft): string {
  const title = draft.title
    ? escapeHtml(draft.title)
    : '<i>(no title yet — tap ✏️ Title)</i>';

  const ingredients =
    draft.ingredients.length > 0
      ? draft.ingredients.map((item) => `• ${escapeHtml(item)}`).join('\n')
      : '<i>(none yet — tap 🥕 Ingredients)</i>';

  const instructions =
    draft.instructions.length > 0
      ? draft.instructions
          .map((step, index) => `${index + 1}. ${escapeHtml(step)}`)
          .join('\n')
      : '<i>(none yet — tap 📋 Instructions)</i>';

  const tags =
    draft.tags.length > 0
      ? draft.tags.map((tag) => `#${escapeHtml(tag)}`).join(' ')
      : '<i>(none)</i>';

  const link = draft.sourceUrl ? escapeHtml(draft.sourceUrl) : '<i>(none)</i>';

  const text = [
    `<b>${title}</b>`,
    '',
    '<b>Ingredients</b>',
    ingredients,
    '',
    '<b>Instructions</b>',
    instructions,
    '',
    `<b>Tags:</b> ${tags}`,
    `<b>Link:</b> ${link}`,
  ].join('\n');

  if (text.length <= MAX_TELEGRAM_MESSAGE_LENGTH) {
    return text;
  }
  return (
    text.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH - TRUNCATION_SUFFIX.length) +
    TRUNCATION_SUFFIX
  );
}
