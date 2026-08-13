import {
  LINEAR_STEPS,
  firstLinearStep,
  getStepDefinition,
  isLinearStep,
  isStepAnswered,
  nextLinearStep,
  stepIndex,
} from './wizard-steps';
import { WizardStep } from './wizard-step.enum';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { DraftState } from '../../recipes/enums/draft-state.enum';

function makeDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    id: 'draft-1',
    telegramChatId: '123',
    state: DraftState.PENDING_CONFIRMATION,
    title: null,
    ingredients: [],
    instructions: [],
    tags: [],
    sourceUrl: null,
    rawExtractedText: null,
    wizardStep: null,
    collectedFields: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('wizard-steps', () => {
  it('marks nome/ingredientes/modo_preparo as core and everything else as optional', () => {
    const coreSteps = LINEAR_STEPS.filter((s) => s.core).map((s) => s.step);
    expect(coreSteps).toEqual([
      WizardStep.NOME,
      WizardStep.INGREDIENTES,
      WizardStep.MODO_PREPARO,
    ]);
  });

  it('firstLinearStep is nome', () => {
    expect(firstLinearStep()).toBe(WizardStep.NOME);
  });

  it('nextLinearStep walks the fixed order', () => {
    expect(nextLinearStep(WizardStep.NOME)).toBe(WizardStep.INGREDIENTES);
    expect(nextLinearStep(WizardStep.INGREDIENTES)).toBe(
      WizardStep.MODO_PREPARO,
    );
    expect(nextLinearStep(WizardStep.TAGS)).toBe(WizardStep.CONFIRMACAO);
  });

  it('nextLinearStep falls back to CONFIRMACAO for a non-linear step', () => {
    expect(nextLinearStep(WizardStep.REVISAR_TITULO_INGREDIENTES)).toBe(
      WizardStep.CONFIRMACAO,
    );
  });

  it('isLinearStep distinguishes linear steps from review/confirmation pseudo-steps', () => {
    expect(isLinearStep(WizardStep.NOME)).toBe(true);
    expect(isLinearStep(WizardStep.REVISAR_MODO_PREPARO)).toBe(false);
    expect(isLinearStep(WizardStep.CONFIRMACAO)).toBe(false);
  });

  it('stepIndex places CONFIRMACAO after every linear step and review steps before all of them', () => {
    expect(stepIndex(WizardStep.CONFIRMACAO)).toBe(LINEAR_STEPS.length);
    expect(stepIndex(WizardStep.REVISAR_TITULO_INGREDIENTES)).toBe(-1);
    expect(stepIndex(WizardStep.NOME)).toBe(0);
    expect(stepIndex(WizardStep.TAGS)).toBe(LINEAR_STEPS.length - 1);
  });

  it('getStepDefinition returns undefined for non-linear steps', () => {
    expect(getStepDefinition(WizardStep.CONFIRMACAO)).toBeUndefined();
    expect(getStepDefinition(WizardStep.NOME)?.draftField).toBe('title');
  });

  describe('isStepAnswered', () => {
    it('checks typed columns for draftField-backed steps', () => {
      const nome = getStepDefinition(WizardStep.NOME)!;
      expect(isStepAnswered(makeDraft({ title: 'Bolo' }), nome)).toBe(true);
      expect(isStepAnswered(makeDraft({ title: null }), nome)).toBe(false);
      expect(isStepAnswered(makeDraft({ title: '   ' }), nome)).toBe(false);
    });

    it('checks array length for ingredients/instructions/tags', () => {
      const ingredientes = getStepDefinition(WizardStep.INGREDIENTES)!;
      expect(
        isStepAnswered(makeDraft({ ingredients: ['ovo'] }), ingredientes),
      ).toBe(true);
      expect(isStepAnswered(makeDraft({ ingredients: [] }), ingredientes)).toBe(
        false,
      );
    });

    it('checks presence for source_url', () => {
      const link = getStepDefinition(WizardStep.LINK)!;
      expect(
        isStepAnswered(makeDraft({ sourceUrl: 'https://x.com' }), link),
      ).toBe(true);
      expect(isStepAnswered(makeDraft({ sourceUrl: null }), link)).toBe(false);
    });

    it('checks collected_fields for observações/rendimento/tempo_preparo', () => {
      const observacoes = getStepDefinition(WizardStep.OBSERVACOES)!;
      expect(
        isStepAnswered(
          makeDraft({ collectedFields: { observacoes: 'sem glúten' } }),
          observacoes,
        ),
      ).toBe(true);
      expect(
        isStepAnswered(makeDraft({ collectedFields: {} }), observacoes),
      ).toBe(false);
    });
  });
});
