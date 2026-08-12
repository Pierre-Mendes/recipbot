import { buildDraftPreviewKeyboard } from './draft-preview.keyboard';

describe('buildDraftPreviewKeyboard', () => {
  it('encodes the draft id into every button callback_data', () => {
    const draftId = '123e4567-e89b-12d3-a456-426614174000';
    const { reply_markup } = buildDraftPreviewKeyboard(draftId);

    const flatButtons = reply_markup.inline_keyboard.flat();
    const callbackData = flatButtons.map((btn) =>
      'callback_data' in btn ? btn.callback_data : undefined,
    );

    expect(callbackData).toEqual([
      `edit:title:${draftId}`,
      `edit:ingredients:${draftId}`,
      `edit:instructions:${draftId}`,
      `edit:tags:${draftId}`,
      `edit:source_url:${draftId}`,
      `confirm:${draftId}`,
      `reject:${draftId}`,
    ]);
  });

  it("stays within Telegram's 64-byte callback_data limit for a UUID draft id", () => {
    const draftId = '123e4567-e89b-12d3-a456-426614174000';
    const { reply_markup } = buildDraftPreviewKeyboard(draftId);

    for (const btn of reply_markup.inline_keyboard.flat()) {
      if ('callback_data' in btn) {
        expect(
          Buffer.byteLength(btn.callback_data, 'utf-8'),
        ).toBeLessThanOrEqual(64);
      }
    }
  });
});
