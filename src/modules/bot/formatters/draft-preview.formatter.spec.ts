import { formatDraftPreview } from './draft-preview.formatter';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { DraftState } from '../../recipes/enums/draft-state.enum';
import { MAX_TELEGRAM_MESSAGE_LENGTH } from '../bot.constants';

function makeDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    id: 'draft-1',
    telegramChatId: '123',
    state: DraftState.PENDING_CONFIRMATION,
    title: 'Bolo de Cenoura',
    ingredients: ['2 cenouras', '3 ovos'],
    instructions: ['Bata tudo', 'Asse por 40 min'],
    tags: ['sobremesa'],
    sourceUrl: 'https://example.com/bolo',
    rawExtractedText: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('formatDraftPreview', () => {
  it('renders title, bulleted ingredients, numbered instructions, tags, and link', () => {
    const text = formatDraftPreview(makeDraft());

    expect(text).toContain('<b>Bolo de Cenoura</b>');
    expect(text).toContain('• 2 cenouras');
    expect(text).toContain('• 3 ovos');
    expect(text).toContain('1. Bata tudo');
    expect(text).toContain('2. Asse por 40 min');
    expect(text).toContain('#sobremesa');
    expect(text).toContain('https://example.com/bolo');
  });

  it('shows placeholders for empty fields instead of blank sections', () => {
    const text = formatDraftPreview(
      makeDraft({
        title: null,
        ingredients: [],
        instructions: [],
        tags: [],
        sourceUrl: null,
      }),
    );

    expect(text).toContain('(no title yet');
    expect(text).toContain('(none yet — tap 🥕 Ingredients)');
    expect(text).toContain('(none yet — tap 📋 Instructions)');
    expect(text).toContain('<b>Tags:</b> <i>(none)</i>');
    expect(text).toContain('<b>Link:</b> <i>(none)</i>');
  });

  it('escapes HTML-significant characters in user-supplied content', () => {
    const text = formatDraftPreview(
      makeDraft({
        title: 'Fish & Chips <best>',
        ingredients: ['1 cup <flour>'],
      }),
    );

    expect(text).toContain('Fish &amp; Chips &lt;best&gt;');
    expect(text).toContain('1 cup &lt;flour&gt;');
    expect(text).not.toContain('<best>');
  });

  it('truncates output that would exceed the Telegram message length limit', () => {
    const text = formatDraftPreview(
      makeDraft({
        ingredients: Array(500).fill('a very long ingredient line'),
      }),
    );

    expect(text.length).toBe(MAX_TELEGRAM_MESSAGE_LENGTH);
    expect(text).toContain('(preview truncated)');
  });
});
