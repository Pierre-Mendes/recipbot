import { Injectable } from '@nestjs/common';
import { RecipesService } from '../../recipes/recipes.service';
import { OcrService } from '../../ocr/ocr.service';
import { ScrapingService } from '../../scraping/scraping.service';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { EditableDraftField } from '../../recipes/editable-draft-field';
import { DraftValidationException } from '../../recipes/exceptions/draft-validation.exception';
import { WizardCacheService, WizardSweepResult } from './wizard-cache.service';
import { WizardStep } from './wizard-step.enum';
import {
  LINEAR_STEPS,
  getStepDefinition,
  nextLinearStep,
  firstLinearStep,
  stepIndex,
  isStepAnswered,
} from './wizard-steps';
import { WizardResult, StepListEntry } from './wizard-result.interface';
import { MAX_COLLECTED_FIELD_LENGTH } from './wizard.constants';

const REVIEW_RETURN_KEY = '__reviewReturn';

@Injectable()
export class WizardService {
  constructor(
    private readonly cache: WizardCacheService,
    private readonly recipesService: RecipesService,
    private readonly ocrService: OcrService,
    private readonly scrapingService: ScrapingService,
  ) {}

  hasActiveSession(chatId: string): boolean {
    return this.cache.has(chatId);
  }

  sweep(now?: number): WizardSweepResult {
    return this.cache.sweep(now);
  }

  showEntryMenu(): WizardResult {
    return { kind: 'entry_menu' };
  }

  /** Only meaningful when there is no active in-memory session — offers to resume a draft the TTL cache lost track of (US08). */
  async checkResumeOffer(chatId: string): Promise<WizardResult | null> {
    if (this.cache.has(chatId)) return null;
    const draft = await this.recipesService.findLatestInProgressDraft(chatId);
    if (!draft) return null;
    return { kind: 'resume_offer', draft };
  }

  async resume(chatId: string): Promise<WizardResult> {
    const draft = await this.recipesService.findLatestInProgressDraft(chatId);
    if (!draft || !draft.wizardStep) {
      return { kind: 'no_active_wizard' };
    }
    const step = draft.wizardStep as WizardStep;
    this.cache.start(chatId, draft.id, step, 'texto');
    return this.buildResultForStep(draft, step);
  }

  async restart(chatId: string): Promise<WizardResult> {
    const draft = await this.recipesService.findLatestInProgressDraft(chatId);
    if (draft) {
      await this.recipesService
        .rejectDraft(chatId, draft.id)
        .catch(() => undefined);
    }
    this.cache.remove(chatId);
    return { kind: 'entry_menu' };
  }

  // ---- Starting a flow (US06) ----------------------------------------

  async startTextFlow(chatId: string): Promise<WizardResult> {
    const step = firstLinearStep();
    const draft = await this.recipesService.createEmptyDraft(chatId, step);
    this.cache.start(chatId, draft.id, step, 'texto');
    return this.buildResultForStep(draft, step);
  }

  /** Throws InvalidImageException/OcrExtractionFailedException — caller distinguishes them for the user-facing message. */
  async startImageFlow(
    chatId: string,
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<WizardResult> {
    const extraction = await this.ocrService.extractRecipeFromImage(
      imageBuffer,
      mimeType,
    );
    const step = WizardStep.REVISAR_TITULO_INGREDIENTES;
    const draft = await this.recipesService.createDraftFromExtraction(
      chatId,
      extraction,
      step,
    );
    this.cache.start(chatId, draft.id, step, 'imagem');
    return this.buildResultForStep(draft, step);
  }

  /** Throws SsrfBlockedException/ScrapingFailedException — caller distinguishes them for the user-facing message. */
  async startLinkFlow(chatId: string, url: string): Promise<WizardResult> {
    const page = await this.scrapingService.scrapeUrl(url);
    const step = WizardStep.REVISAR_TITULO_INGREDIENTES;
    const draft = await this.recipesService.createDraftFromExtraction(
      chatId,
      {
        title: page.title,
        ingredients: [],
        instructions: [],
        rawExtractedText: page.text,
      },
      step,
      page.sourceUrl,
    );
    this.cache.start(chatId, draft.id, step, 'link');
    return this.buildResultForStep(draft, step);
  }

  // ---- Answering the current step -------------------------------------

  async handleTextReply(chatId: string, text: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);

    const step = session.step;
    let draft = await this.recipesService.getDraft(chatId, session.draftId);

    if (
      step === WizardStep.REVISAR_TITULO_INGREDIENTES ||
      step === WizardStep.REVISAR_MODO_PREPARO
    ) {
      // A review step expects a button tap, not free text — just re-show it.
      return this.buildResultForStep(draft, step);
    }

    const definition = getStepDefinition(step);
    if (!definition) {
      return this.buildResultForStep(draft, WizardStep.CONFIRMACAO);
    }

    const trimmed = text.trim();

    if (definition.draftField) {
      try {
        draft = await this.recipesService.updateDraftField(
          chatId,
          session.draftId,
          definition.draftField,
          trimmed,
        );
      } catch (error) {
        if (error instanceof DraftValidationException) {
          return {
            kind: 'validation_error',
            step,
            message: stepValidationMessagePtBr(step),
            core: definition.core,
          };
        }
        throw error;
      }
    } else if (definition.collectedField) {
      if (trimmed.length > MAX_COLLECTED_FIELD_LENGTH) {
        return {
          kind: 'validation_error',
          step,
          message: `Esse texto ficou muito longo (máximo de ${MAX_COLLECTED_FIELD_LENGTH} caracteres). Tente algo mais curto, ou toque em Pular.`,
          core: false,
        };
      }
      const collected = {
        ...draft.collectedFields,
        [definition.collectedField]: trimmed,
      };
      draft = await this.recipesService.updateWizardState(
        chatId,
        session.draftId,
        step,
        collected,
      );
    }

    return this.afterStepCompleted(chatId, draft, step);
  }

  async skip(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    const draft = await this.recipesService.getDraft(chatId, session.draftId);
    return this.afterStepCompleted(chatId, draft, session.step);
  }

  async handleReviewAction(
    chatId: string,
    action: 'confirm' | 'edit',
    part: 'title_ingredients' | 'instructions',
  ): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    const draft = await this.recipesService.getDraft(chatId, session.draftId);

    if (action === 'confirm') {
      const next =
        part === 'title_ingredients'
          ? WizardStep.REVISAR_MODO_PREPARO
          : WizardStep.OBSERVACOES;
      return this.advanceToStep(chatId, draft, next);
    }

    if (part === 'title_ingredients') {
      const collected = {
        ...draft.collectedFields,
        [REVIEW_RETURN_KEY]: 'title_ingredients',
      };
      const updated = await this.recipesService.updateWizardState(
        chatId,
        draft.id,
        WizardStep.NOME,
        collected,
      );
      this.cache.updateStep(chatId, WizardStep.NOME);
      return this.buildResultForStep(updated, WizardStep.NOME);
    }

    const updated = await this.recipesService.updateWizardState(
      chatId,
      draft.id,
      WizardStep.MODO_PREPARO,
      draft.collectedFields,
    );
    this.cache.updateStep(chatId, WizardStep.MODO_PREPARO);
    return this.buildResultForStep(updated, WizardStep.MODO_PREPARO);
  }

  // ---- Navigation: /retroceder, /avancar (US07) ------------------------

  async listBackSteps(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    const draft = await this.recipesService.getDraft(chatId, session.draftId);
    const currentIndex = stepIndex(session.step);

    const entries: StepListEntry[] = LINEAR_STEPS.filter(
      (_, index) => index < currentIndex,
    ).map((definition) => ({
      step: definition.step,
      label: definition.label,
      answered: isStepAnswered(draft, definition),
    }));
    return { kind: 'step_list', mode: 'back', entries };
  }

  async listForwardSteps(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    const draft = await this.recipesService.getDraft(chatId, session.draftId);
    const currentIndex = stepIndex(session.step);

    const entries: StepListEntry[] = LINEAR_STEPS.filter(
      (_, index) => index > currentIndex,
    ).map((definition) => ({
      step: definition.step,
      label: definition.label,
      answered: isStepAnswered(draft, definition),
    }));
    return { kind: 'step_list', mode: 'forward', entries };
  }

  /** Jumping back discards the target step and everything after it — the user re-answers from there forward (US07). */
  async goBackTo(chatId: string, step: WizardStep): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    let draft = await this.recipesService.getDraft(chatId, session.draftId);
    const targetIndex = stepIndex(step);
    draft = await this.clearFieldsInRange(
      chatId,
      draft,
      targetIndex,
      LINEAR_STEPS.length,
    );
    return this.advanceToStep(chatId, draft, step);
  }

  /** Jumping forward marks everything skipped over (current step through the step before the target) as not-answered (US07). */
  async goForwardTo(chatId: string, step: WizardStep): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    let draft = await this.recipesService.getDraft(chatId, session.draftId);
    const currentIndex = Math.max(stepIndex(session.step), 0);
    const targetIndex = stepIndex(step);
    draft = await this.clearFieldsInRange(
      chatId,
      draft,
      currentIndex,
      targetIndex,
    );
    return this.advanceToStep(chatId, draft, step);
  }

  // ---- Final confirmation (US07) ---------------------------------------

  async completeNow(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    this.cache.touch(chatId);
    const draft = await this.recipesService.getDraft(chatId, session.draftId);

    const coreSteps = [
      WizardStep.NOME,
      WizardStep.INGREDIENTES,
      WizardStep.MODO_PREPARO,
    ];
    const firstMissing =
      coreSteps.find(
        (step) => !isStepAnswered(draft, getStepDefinition(step)!),
      ) ?? WizardStep.NOME;
    return this.advanceToStep(chatId, draft, firstMissing);
  }

  /** Normal "Salvar" — only reachable when no core fields are missing, so strict validation is expected to pass. */
  async save(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    const recipe = await this.recipesService.confirmDraft(
      chatId,
      session.draftId,
      false,
    );
    this.cache.remove(chatId);
    return { kind: 'saved', recipe };
  }

  /** "Salvar assim mesmo" — never blocks on empty core fields (US07). */
  async saveAnyway(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    const recipe = await this.recipesService.confirmDraft(
      chatId,
      session.draftId,
      true,
    );
    this.cache.remove(chatId);
    return { kind: 'saved', recipe };
  }

  async cancel(chatId: string): Promise<WizardResult> {
    const session = this.cache.get(chatId);
    if (!session) return { kind: 'no_active_wizard' };
    await this.recipesService.rejectDraft(chatId, session.draftId);
    this.cache.remove(chatId);
    return { kind: 'cancelled' };
  }

  // ---- Internals --------------------------------------------------------

  private buildResultForStep(
    draft: RecipeDraft,
    step: WizardStep,
  ): WizardResult {
    if (step === WizardStep.CONFIRMACAO) {
      const missing = this.recipesService.getMissingCoreFields(draft);
      return missing.length > 0
        ? { kind: 'soft_warning', draft, missingFields: missing }
        : { kind: 'confirmation', draft };
    }
    if (step === WizardStep.REVISAR_TITULO_INGREDIENTES) {
      return { kind: 'review', part: 'title_ingredients', draft };
    }
    if (step === WizardStep.REVISAR_MODO_PREPARO) {
      return { kind: 'review', part: 'instructions', draft };
    }
    const definition = getStepDefinition(step);
    if (!definition) {
      return this.buildResultForStep(draft, WizardStep.CONFIRMACAO);
    }
    return {
      kind: 'prompt',
      step,
      prompt: definition.prompt,
      core: definition.core,
    };
  }

  private async advanceToStep(
    chatId: string,
    draft: RecipeDraft,
    step: WizardStep,
  ): Promise<WizardResult> {
    const updated = await this.recipesService.updateWizardState(
      chatId,
      draft.id,
      step,
      draft.collectedFields,
    );
    this.cache.updateStep(chatId, step);
    return this.buildResultForStep(updated, step);
  }

  /**
   * After a linear step is answered/skipped, normally moves to the next
   * one — except when it's the ingredientes step of a title_ingredients
   * review-edit detour (US06b "Editar" only re-asks that one part): then
   * it returns straight to the instructions review instead of re-asking
   * modo_preparo, which was never flagged for edit.
   */
  private async afterStepCompleted(
    chatId: string,
    draft: RecipeDraft,
    completedStep: WizardStep,
  ): Promise<WizardResult> {
    const reviewReturn = draft.collectedFields[REVIEW_RETURN_KEY];
    if (
      completedStep === WizardStep.INGREDIENTES &&
      reviewReturn === 'title_ingredients'
    ) {
      const rest = { ...draft.collectedFields };
      delete rest[REVIEW_RETURN_KEY];
      const updated = await this.recipesService.updateWizardState(
        chatId,
        draft.id,
        WizardStep.REVISAR_MODO_PREPARO,
        rest,
      );
      this.cache.updateStep(chatId, WizardStep.REVISAR_MODO_PREPARO);
      return this.buildResultForStep(updated, WizardStep.REVISAR_MODO_PREPARO);
    }

    const next = nextLinearStep(completedStep);
    return this.advanceToStep(chatId, draft, next);
  }

  private async clearFieldsInRange(
    chatId: string,
    draft: RecipeDraft,
    fromIndex: number,
    toIndexExclusive: number,
  ): Promise<RecipeDraft> {
    const draftFieldsToReset: EditableDraftField[] = [];
    const collected = { ...draft.collectedFields };
    let collectedChanged = false;

    const start = Math.max(fromIndex, 0);
    const end = Math.min(toIndexExclusive, LINEAR_STEPS.length);
    for (let i = start; i < end; i++) {
      const definition = LINEAR_STEPS[i];
      if (definition.draftField) {
        draftFieldsToReset.push(definition.draftField);
      }
      if (definition.collectedField && definition.collectedField in collected) {
        delete collected[definition.collectedField];
        collectedChanged = true;
      }
    }

    let current = draft;
    if (draftFieldsToReset.length > 0) {
      current = await this.recipesService.clearDraftFields(
        chatId,
        draft.id,
        draftFieldsToReset,
      );
    }
    if (collectedChanged) {
      current = await this.recipesService.updateWizardState(
        chatId,
        draft.id,
        current.wizardStep,
        collected,
      );
    }
    return current;
  }
}

function stepValidationMessagePtBr(step: WizardStep): string {
  switch (step) {
    case WizardStep.LINK:
      return 'Esse link não parece válido ou não é permitido por segurança. Envie outro link, ou toque em Pular.';
    case WizardStep.TAGS:
      return 'As tags devem ter só letras minúsculas, números e hífen, separadas por vírgula (ex: sobremesa, facil). Tente de novo, ou toque em Pular.';
    case WizardStep.NOME:
      return 'Esse nome não é válido (talvez muito longo). Tente algo mais curto.';
    case WizardStep.INGREDIENTES:
      return 'Não consegui entender os ingredientes (talvez alguma linha muito longa). Tente enviar de novo, um por linha.';
    case WizardStep.MODO_PREPARO:
      return 'Não consegui entender o modo de preparo (talvez algum passo muito longo). Tente enviar de novo, um passo por linha.';
    default:
      return 'Não consegui salvar essa resposta. Tente novamente, ou toque em Pular.';
  }
}
