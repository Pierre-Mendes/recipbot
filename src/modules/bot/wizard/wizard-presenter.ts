import { Markup } from 'telegraf';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { escapeHtml } from '../formatters/html-escape.util';
import {
  MAX_TELEGRAM_MESSAGE_LENGTH,
  TRUNCATION_SUFFIX,
} from '../bot.constants';
import { WizardResult } from './wizard-result.interface';
import { WizardStep } from './wizard-step.enum';
import {
  backGotoCallback,
  CANCEL_CALLBACK,
  COMPLETE_NOW_CALLBACK,
  EDIT_SOMETHING_CALLBACK,
  forwardGotoCallback,
  menuCallback,
  RESTART_CALLBACK,
  RESUME_CALLBACK,
  reviewCallback,
  SAVE_ANYWAY_CALLBACK,
  SAVE_CALLBACK,
  SKIP_CALLBACK,
} from './wizard-callbacks';

export interface WizardMessage {
  text: string;
  keyboard?: ReturnType<typeof Markup.inlineKeyboard>;
}

/** Converts a WizardResult into the pt-BR message + inline keyboard sent to the user. Every string here is pt-BR — this is the single place that renders wizard state as chat text. */
export function presentWizardResult(result: WizardResult): WizardMessage {
  switch (result.kind) {
    case 'entry_menu':
      return {
        text: 'O que vamos fazer? Escolha uma opção:',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('📝 Texto', menuCallback('texto'))],
          [Markup.button.callback('📷 Imagem / Print', menuCallback('imagem'))],
          [Markup.button.callback('🔗 Link do site', menuCallback('link'))],
        ]),
      };

    case 'prompt':
      return {
        text: result.prompt,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('⏭ Pular', SKIP_CALLBACK)],
        ]),
      };

    case 'validation_error':
      return {
        text: result.message,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('⏭ Pular', SKIP_CALLBACK)],
        ]),
      };

    case 'review':
      return presentReview(result.part, result.draft);

    case 'step_list':
      return presentStepList(result.mode, result.entries);

    case 'confirmation':
      return {
        text: formatDraftSummary(result.draft),
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Salvar', SAVE_CALLBACK)],
          [Markup.button.callback('✏️ Editar algo', EDIT_SOMETHING_CALLBACK)],
          [Markup.button.callback('❌ Cancelar', CANCEL_CALLBACK)],
        ]),
      };

    case 'soft_warning':
      return {
        text: `⚠️ Essa receita ainda está incompleta (faltam: ${result.missingFields.join(', ')}). Quer salvar assim mesmo ou completar agora?`,
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '💾 Salvar assim mesmo',
              SAVE_ANYWAY_CALLBACK,
            ),
          ],
          [Markup.button.callback('✏️ Completar agora', COMPLETE_NOW_CALLBACK)],
        ]),
      };

    case 'saved':
      return {
        text: `✅ Receita <b>${escapeHtml(result.recipe.title || '(sem nome)')}</b> salva com sucesso!`,
      };

    case 'cancelled':
      return { text: '❌ Rascunho cancelado.' };

    case 'resume_offer':
      return {
        text: 'Seu progresso anterior expirou, mas o rascunho da receita continua salvo. Quer continuar de onde parou ou começar do zero?',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('▶️ Continuar', RESUME_CALLBACK)],
          [Markup.button.callback('🔄 Começar do zero', RESTART_CALLBACK)],
        ]),
      };

    case 'no_active_wizard':
      return {
        text: 'Não há nenhuma receita em andamento. Use /nova para começar uma.',
      };
  }
}

function presentReview(
  part: 'title_ingredients' | 'instructions',
  draft: RecipeDraft,
): WizardMessage {
  const text =
    part === 'title_ingredients'
      ? formatTitleIngredients(draft)
      : formatInstructionsOnly(draft);

  return {
    text: `${text}\n\nEstá correto?`,
    keyboard: Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Confirmar', reviewCallback('confirm', part)),
        Markup.button.callback('✏️ Editar', reviewCallback('edit', part)),
      ],
    ]),
  };
}

function presentStepList(
  mode: 'back' | 'forward',
  entries: { step: WizardStep; label: string; answered: boolean }[],
): WizardMessage {
  if (entries.length === 0) {
    return {
      text:
        mode === 'back'
          ? 'Ainda não há etapas concluídas para voltar.'
          : 'Não há mais etapas à frente.',
    };
  }

  const question =
    mode === 'back'
      ? 'Para qual etapa você quer voltar?'
      : 'Para qual etapa você quer avançar?';
  const gotoCallback = mode === 'back' ? backGotoCallback : forwardGotoCallback;

  const buttons = entries.map((entry, index) => [
    Markup.button.callback(
      `${index + 1}. ${entry.label} ${entry.answered ? '✅' : '⬜'}`,
      gotoCallback(entry.step),
    ),
  ]);

  return { text: question, keyboard: Markup.inlineKeyboard(buttons) };
}

function formatTitleIngredients(draft: RecipeDraft): string {
  const title = draft.title ? escapeHtml(draft.title) : '<i>(sem nome)</i>';
  const ingredients =
    draft.ingredients.length > 0
      ? draft.ingredients.map((item) => `• ${escapeHtml(item)}`).join('\n')
      : '<i>(nenhum ingrediente encontrado)</i>';
  return truncate(`<b>${title}</b>\n\n<b>Ingredientes</b>\n${ingredients}`);
}

function formatInstructionsOnly(draft: RecipeDraft): string {
  const instructions =
    draft.instructions.length > 0
      ? draft.instructions
          .map((step, i) => `${i + 1}. ${escapeHtml(step)}`)
          .join('\n')
      : '<i>(nenhum passo encontrado)</i>';
  return truncate(`<b>Modo de preparo</b>\n${instructions}`);
}

function formatDraftSummary(draft: RecipeDraft): string {
  const title = draft.title ? escapeHtml(draft.title) : '<i>(sem nome)</i>';
  const ingredients =
    draft.ingredients.length > 0
      ? draft.ingredients.map((item) => `• ${escapeHtml(item)}`).join('\n')
      : '<i>(nenhum)</i>';
  const instructions =
    draft.instructions.length > 0
      ? draft.instructions
          .map((step, i) => `${i + 1}. ${escapeHtml(step)}`)
          .join('\n')
      : '<i>(nenhum)</i>';
  const observacoes = collectedText(draft, 'observacoes') ?? '<i>(nenhuma)</i>';
  const rendimento =
    collectedText(draft, 'rendimento') ?? '<i>(não informado)</i>';
  const tempoPreparo =
    collectedText(draft, 'tempo_preparo') ?? '<i>(não informado)</i>';
  const link = draft.sourceUrl
    ? escapeHtml(draft.sourceUrl)
    : '<i>(nenhum)</i>';
  const tags =
    draft.tags.length > 0
      ? draft.tags.map((tag) => `#${escapeHtml(tag)}`).join(' ')
      : '<i>(nenhuma)</i>';

  const text = [
    `<b>${title}</b>`,
    '',
    '<b>Ingredientes</b>',
    ingredients,
    '',
    '<b>Modo de preparo</b>',
    instructions,
    '',
    `<b>Observações:</b> ${observacoes}`,
    `<b>Rendimento:</b> ${rendimento}`,
    `<b>Tempo de preparo:</b> ${tempoPreparo}`,
    `<b>Link:</b> ${link}`,
    `<b>Tags:</b> ${tags}`,
  ].join('\n');

  return truncate(text);
}

function collectedText(draft: RecipeDraft, key: string): string | null {
  const value = draft.collectedFields[key];
  return typeof value === 'string' && value.length > 0
    ? escapeHtml(value)
    : null;
}

function truncate(text: string): string {
  if (text.length <= MAX_TELEGRAM_MESSAGE_LENGTH) return text;
  return (
    text.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH - TRUNCATION_SUFFIX.length) +
    TRUNCATION_SUFFIX
  );
}
