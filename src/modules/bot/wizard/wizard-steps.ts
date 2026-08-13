import { EditableDraftField } from '../../recipes/editable-draft-field';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { WizardStep } from './wizard-step.enum';

/** Optional fields with no dedicated recipe_drafts column — persisted as plain strings in collected_fields JSONB. */
export type CollectedOnlyField = 'observacoes' | 'rendimento' | 'tempo_preparo';

export interface LinearStepDefinition {
  step: WizardStep;
  /** Short pt-BR label used in /retroceder and /avancar step lists. */
  label: string;
  /** pt-BR question sent to the user when this step is reached. */
  prompt: string;
  core: boolean;
  /** Set when the answer is persisted via DraftsRepository.updateFields (typed column). */
  draftField: EditableDraftField | null;
  /** Set when the answer is persisted as a plain string in collected_fields JSONB. */
  collectedField: CollectedOnlyField | null;
}

/**
 * Same order for every capture type (US06). nome/ingredientes/modo_de_preparo
 * are core but never block progress (US07) — "core" only affects the
 * soft-warning shown at final confirmation if still empty by then.
 */
export const LINEAR_STEPS: readonly LinearStepDefinition[] = [
  {
    step: WizardStep.NOME,
    label: 'Nome',
    prompt: 'Qual o nome da receita?',
    core: true,
    draftField: 'title',
    collectedField: null,
  },
  {
    step: WizardStep.INGREDIENTES,
    label: 'Ingredientes',
    prompt: 'Quais são os ingredientes? Envie um por linha.',
    core: true,
    draftField: 'ingredients',
    collectedField: null,
  },
  {
    step: WizardStep.MODO_PREPARO,
    label: 'Modo de preparo',
    prompt: 'Qual o modo de preparo? Envie um passo por linha.',
    core: true,
    draftField: 'instructions',
    collectedField: null,
  },
  {
    step: WizardStep.OBSERVACOES,
    label: 'Observações',
    prompt: 'Quer adicionar alguma observação sobre a receita?',
    core: false,
    draftField: null,
    collectedField: 'observacoes',
  },
  {
    step: WizardStep.RENDIMENTO,
    label: 'Rendimento',
    prompt: 'Qual o rendimento, ou quantas porções a receita faz?',
    core: false,
    draftField: null,
    collectedField: 'rendimento',
  },
  {
    step: WizardStep.TEMPO_PREPARO,
    label: 'Tempo de preparo',
    prompt: 'Quanto tempo leva o preparo?',
    core: false,
    draftField: null,
    collectedField: 'tempo_preparo',
  },
  {
    step: WizardStep.LINK,
    label: 'Link',
    prompt:
      'Quer adicionar o link de um Reels, vídeo ou site relacionado à receita?',
    core: false,
    draftField: 'source_url',
    collectedField: null,
  },
  {
    step: WizardStep.TAGS,
    label: 'Tags',
    prompt:
      'Quer adicionar tags? Isso ajuda a encontrar a receita depois na busca (ex: sobremesa, facil). Separe por vírgula.',
    core: false,
    draftField: 'tags',
    collectedField: null,
  },
];

const STEP_INDEX = new Map<WizardStep, number>(
  LINEAR_STEPS.map((definition, index) => [definition.step, index]),
);

export function getStepDefinition(
  step: WizardStep,
): LinearStepDefinition | undefined {
  return LINEAR_STEPS.find((definition) => definition.step === step);
}

export function isLinearStep(step: WizardStep): boolean {
  return STEP_INDEX.has(step);
}

/** The step after `step` in the fixed order, or CONFIRMACAO after the last one. */
export function nextLinearStep(step: WizardStep): WizardStep {
  const index = STEP_INDEX.get(step);
  if (index === undefined || index === LINEAR_STEPS.length - 1) {
    return WizardStep.CONFIRMACAO;
  }
  return LINEAR_STEPS[index + 1].step;
}

export function firstLinearStep(): WizardStep {
  return LINEAR_STEPS[0].step;
}

/**
 * Position in the linear order: -1 for the image/link review pseudo-steps
 * (nothing linear has happened yet), LINEAR_STEPS.length for CONFIRMACAO
 * (every linear step is behind it). Used by /retroceder and /avancar to
 * split the step list into "already passed" vs "not yet reached".
 */
export function stepIndex(step: WizardStep): number {
  if (step === WizardStep.CONFIRMACAO) return LINEAR_STEPS.length;
  return STEP_INDEX.get(step) ?? -1;
}

/** Whether this step's field currently holds a value on the draft (used for the ✅ in /retroceder and /avancar listings). */
export function isStepAnswered(
  draft: RecipeDraft,
  definition: LinearStepDefinition,
): boolean {
  switch (definition.draftField) {
    case 'title':
      return Boolean(draft.title && draft.title.trim().length > 0);
    case 'ingredients':
      return draft.ingredients.length > 0;
    case 'instructions':
      return draft.instructions.length > 0;
    case 'tags':
      return draft.tags.length > 0;
    case 'source_url':
      return Boolean(draft.sourceUrl);
    default:
      break;
  }
  if (definition.collectedField) {
    const value = draft.collectedFields[definition.collectedField];
    return typeof value === 'string' && value.length > 0;
  }
  return false;
}
