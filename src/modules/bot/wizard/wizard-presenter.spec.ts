import { presentWizardResult } from './wizard-presenter';
import { WizardResult } from './wizard-result.interface';
import { WizardStep } from './wizard-step.enum';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { Recipe } from '../../recipes/interfaces/recipe.interface';
import { DraftState } from '../../recipes/enums/draft-state.enum';
import { MAX_TELEGRAM_MESSAGE_LENGTH } from '../bot.constants';

function callbackDataOf(button: { text: string }): string | undefined {
  return 'callback_data' in button
    ? (button as { callback_data: string }).callback_data
    : undefined;
}

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
    wizardStep: WizardStep.CONFIRMACAO,
    collectedFields: { observacoes: 'Sem glúten', rendimento: '8 fatias' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    telegramChatId: '123',
    title: 'Bolo de Cenoura',
    ingredients: ['a'],
    instructions: ['b'],
    tags: [],
    sourceUrl: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('presentWizardResult', () => {
  it('entry_menu offers Texto/Imagem/Link', () => {
    const { text, keyboard } = presentWizardResult({ kind: 'entry_menu' });
    expect(text).toContain('O que vamos fazer');
    const buttons = keyboard!.reply_markup.inline_keyboard.flat();
    expect(buttons.map((b) => ('text' in b ? b.text : ''))).toEqual([
      '📝 Texto',
      '📷 Imagem / Print',
      '🔗 Link do site',
    ]);
  });

  it('prompt shows the step question with a Pular button', () => {
    const result: WizardResult = {
      kind: 'prompt',
      step: WizardStep.NOME,
      prompt: 'Qual o nome da receita?',
      core: true,
    };
    const { text, keyboard } = presentWizardResult(result);
    expect(text).toBe('Qual o nome da receita?');
    expect(keyboard!.reply_markup.inline_keyboard[0][0]).toEqual(
      expect.objectContaining({ text: '⏭ Pular', callback_data: 'wz:skip' }),
    );
  });

  it('validation_error shows the message with a Pular button (never blocks)', () => {
    const result: WizardResult = {
      kind: 'validation_error',
      step: WizardStep.LINK,
      message: 'Link inválido.',
      core: false,
    };
    const { text, keyboard } = presentWizardResult(result);
    expect(text).toBe('Link inválido.');
    expect(callbackDataOf(keyboard!.reply_markup.inline_keyboard[0][0])).toBe(
      'wz:skip',
    );
  });

  describe('review', () => {
    it('title_ingredients shows title + ingredients with Confirmar/Editar', () => {
      const { text, keyboard } = presentWizardResult({
        kind: 'review',
        part: 'title_ingredients',
        draft: makeDraft(),
      });
      expect(text).toContain('Bolo de Cenoura');
      expect(text).toContain('2 cenouras');
      expect(text).not.toContain('Bata tudo'); // instructions must not leak into this part
      const buttons = keyboard!.reply_markup.inline_keyboard.flat();
      expect(buttons.map((b) => callbackDataOf(b))).toEqual([
        'wz:review:confirm:title_ingredients',
        'wz:review:edit:title_ingredients',
      ]);
    });

    it('instructions shows only the modo de preparo', () => {
      const { text, keyboard } = presentWizardResult({
        kind: 'review',
        part: 'instructions',
        draft: makeDraft(),
      });
      expect(text).toContain('Bata tudo');
      expect(text).not.toContain('2 cenouras');
      const buttons = keyboard!.reply_markup.inline_keyboard.flat();
      expect(buttons.map((b) => callbackDataOf(b))).toEqual([
        'wz:review:confirm:instructions',
        'wz:review:edit:instructions',
      ]);
    });

    it('shows a placeholder when title/ingredients/instructions are empty', () => {
      const empty = makeDraft({
        title: null,
        ingredients: [],
        instructions: [],
      });
      expect(
        presentWizardResult({
          kind: 'review',
          part: 'title_ingredients',
          draft: empty,
        }).text,
      ).toContain('sem nome');
      expect(
        presentWizardResult({
          kind: 'review',
          part: 'instructions',
          draft: empty,
        }).text,
      ).toContain('nenhum passo');
    });
  });

  describe('step_list', () => {
    it('back mode asks which step to return to, numbering the entries', () => {
      const { text, keyboard } = presentWizardResult({
        kind: 'step_list',
        mode: 'back',
        entries: [
          { step: WizardStep.NOME, label: 'Nome', answered: true },
          {
            step: WizardStep.INGREDIENTES,
            label: 'Ingredientes',
            answered: false,
          },
        ],
      });
      expect(text).toContain('voltar');
      const buttons = keyboard!.reply_markup.inline_keyboard.flat();
      expect(buttons[0]).toEqual(
        expect.objectContaining({
          text: '1. Nome ✅',
          callback_data: 'wz:back:nome',
        }),
      );
      expect(buttons[1]).toEqual(
        expect.objectContaining({
          text: '2. Ingredientes ⬜',
          callback_data: 'wz:back:ingredientes',
        }),
      );
    });

    it('forward mode asks which step to advance to', () => {
      const { text, keyboard } = presentWizardResult({
        kind: 'step_list',
        mode: 'forward',
        entries: [{ step: WizardStep.TAGS, label: 'Tags', answered: false }],
      });
      expect(text).toContain('avançar');
      const buttons = keyboard!.reply_markup.inline_keyboard.flat();
      expect(callbackDataOf(buttons[0])).toBe('wz:fwd:tags');
    });

    it('shows a friendly message with no keyboard when the list is empty', () => {
      const back = presentWizardResult({
        kind: 'step_list',
        mode: 'back',
        entries: [],
      });
      expect(back.keyboard).toBeUndefined();
      expect(back.text.length).toBeGreaterThan(0);

      const forward = presentWizardResult({
        kind: 'step_list',
        mode: 'forward',
        entries: [],
      });
      expect(forward.keyboard).toBeUndefined();
    });
  });

  it('confirmation shows the full summary with Salvar/Editar algo/Cancelar', () => {
    const { text, keyboard } = presentWizardResult({
      kind: 'confirmation',
      draft: makeDraft(),
    });
    expect(text).toContain('Bolo de Cenoura');
    expect(text).toContain('Sem glúten'); // observações from collected_fields
    expect(text).toContain('8 fatias'); // rendimento from collected_fields
    expect(text).toContain('example.com/bolo');
    expect(text).toContain('#sobremesa');
    const buttons = keyboard!.reply_markup.inline_keyboard.flat();
    expect(buttons.map((b) => callbackDataOf(b))).toEqual([
      'wz:save',
      'wz:edit_something',
      'wz:cancel',
    ]);
  });

  it('confirmation falls back to placeholders for every unset optional field', () => {
    const draft = makeDraft({
      title: null,
      ingredients: [],
      instructions: [],
      tags: [],
      sourceUrl: null,
      collectedFields: {},
    });
    const { text } = presentWizardResult({ kind: 'confirmation', draft });
    expect(text).toContain('(sem nome)');
    expect(text).toContain('(nenhuma)');
    expect(text).toContain('(não informado)');
    expect(text).toContain('(nenhum)');
  });

  it('soft_warning lists the missing fields with Salvar assim mesmo / Completar agora', () => {
    const { text, keyboard } = presentWizardResult({
      kind: 'soft_warning',
      draft: makeDraft(),
      missingFields: ['ingredientes', 'modo de preparo'],
    });
    expect(text).toContain('faltam: ingredientes, modo de preparo');
    const buttons = keyboard!.reply_markup.inline_keyboard.flat();
    expect(buttons.map((b) => callbackDataOf(b))).toEqual([
      'wz:save_anyway',
      'wz:complete_now',
    ]);
  });

  it('saved confirms the recipe title and has no keyboard', () => {
    const { text, keyboard } = presentWizardResult({
      kind: 'saved',
      recipe: makeRecipe({ title: 'Bolo' }),
    });
    expect(text).toContain('Bolo');
    expect(text).toContain('salva com sucesso');
    expect(keyboard).toBeUndefined();
  });

  it('cancelled has no keyboard', () => {
    const { text, keyboard } = presentWizardResult({ kind: 'cancelled' });
    expect(text).toContain('cancelado');
    expect(keyboard).toBeUndefined();
  });

  it('resume_offer offers Continuar / Começar do zero', () => {
    const { text, keyboard } = presentWizardResult({
      kind: 'resume_offer',
      draft: makeDraft(),
    });
    expect(text).toContain('progresso anterior expirou');
    const buttons = keyboard!.reply_markup.inline_keyboard.flat();
    expect(buttons.map((b) => callbackDataOf(b))).toEqual([
      'wz:resume',
      'wz:restart',
    ]);
  });

  it('no_active_wizard points the user at /nova', () => {
    const { text, keyboard } = presentWizardResult({
      kind: 'no_active_wizard',
    });
    expect(text).toContain('/nova');
    expect(keyboard).toBeUndefined();
  });

  it('escapes HTML-significant characters in user-supplied content', () => {
    const draft = makeDraft({ title: 'Fish & Chips <best>' });
    const { text } = presentWizardResult({ kind: 'confirmation', draft });
    expect(text).toContain('Fish &amp; Chips &lt;best&gt;');
    expect(text).not.toContain('<best>');
  });

  it('truncates the confirmation summary to the Telegram message length limit', () => {
    const draft = makeDraft({
      ingredients: Array(500).fill('um ingrediente bem detalhado'),
    });
    const { text } = presentWizardResult({ kind: 'confirmation', draft });
    expect(text.length).toBe(MAX_TELEGRAM_MESSAGE_LENGTH);
    expect(text).toContain('cortada');
  });
});
