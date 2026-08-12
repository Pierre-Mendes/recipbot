import { Markup } from 'telegraf';

export function buildDraftPreviewKeyboard(draftId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Title', `edit:title:${draftId}`),
      Markup.button.callback('🥕 Ingredients', `edit:ingredients:${draftId}`),
    ],
    [
      Markup.button.callback('📋 Instructions', `edit:instructions:${draftId}`),
      Markup.button.callback('🏷 Tags', `edit:tags:${draftId}`),
    ],
    [Markup.button.callback('🔗 Link', `edit:source_url:${draftId}`)],
    [
      Markup.button.callback('✅ Confirm', `confirm:${draftId}`),
      Markup.button.callback('❌ Cancel', `reject:${draftId}`),
    ],
  ]);
}
