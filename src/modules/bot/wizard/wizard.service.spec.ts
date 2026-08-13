import { WizardService } from './wizard.service';
import { WizardCacheService } from './wizard-cache.service';
import { WizardStep } from './wizard-step.enum';
import { RecipesService } from '../../recipes/recipes.service';
import { OcrService } from '../../ocr/ocr.service';
import { ScrapingService } from '../../scraping/scraping.service';
import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { Recipe } from '../../recipes/interfaces/recipe.interface';
import { DraftState } from '../../recipes/enums/draft-state.enum';
import { DraftValidationException } from '../../recipes/exceptions/draft-validation.exception';

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
    wizardStep: WizardStep.NOME,
    collectedFields: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    telegramChatId: '123',
    title: 'Bolo',
    ingredients: ['a'],
    instructions: ['b'],
    tags: [],
    sourceUrl: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('WizardService', () => {
  let cache: WizardCacheService;
  let recipesService: jest.Mocked<RecipesService>;
  let ocrService: jest.Mocked<OcrService>;
  let scrapingService: jest.Mocked<ScrapingService>;
  let service: WizardService;

  beforeEach(() => {
    cache = new WizardCacheService();
    recipesService = {
      hasHistory: jest.fn(),
      createEmptyDraft: jest.fn(),
      createDraftFromExtraction: jest.fn(),
      getDraft: jest.fn(),
      findLatestInProgressDraft: jest.fn(),
      updateWizardState: jest.fn(),
      updateDraftField: jest.fn(),
      clearDraftFields: jest.fn(),
      getMissingCoreFields: jest.fn().mockReturnValue([]),
      confirmDraft: jest.fn(),
      rejectDraft: jest.fn(),
    } as unknown as jest.Mocked<RecipesService>;
    ocrService = {
      extractRecipeFromImage: jest.fn(),
    } as unknown as jest.Mocked<OcrService>;
    scrapingService = {
      scrapeUrl: jest.fn(),
    } as unknown as jest.Mocked<ScrapingService>;

    // Most tests just want updateWizardState to behave like a real merge-and-return.
    recipesService.updateWizardState.mockImplementation(async (...args) =>
      makeDraft({
        wizardStep: args[2] as string | null,
        collectedFields: args[3],
      }),
    );
    recipesService.rejectDraft.mockResolvedValue(undefined);
    recipesService.clearDraftFields.mockImplementation(async () => makeDraft());

    service = new WizardService(
      cache,
      recipesService,
      ocrService,
      scrapingService,
    );
  });

  describe('startTextFlow', () => {
    it('creates an empty draft at the first step and starts a cache session', async () => {
      const draft = makeDraft({ wizardStep: WizardStep.NOME });
      recipesService.createEmptyDraft.mockResolvedValue(draft);

      const result = await service.startTextFlow('123');

      expect(recipesService.createEmptyDraft).toHaveBeenCalledWith(
        '123',
        WizardStep.NOME,
      );
      expect(cache.get('123')).toEqual(
        expect.objectContaining({
          draftId: 'draft-1',
          step: WizardStep.NOME,
          captureType: 'texto',
        }),
      );
      expect(result).toEqual({
        kind: 'prompt',
        step: WizardStep.NOME,
        prompt: expect.stringContaining('nome'),
        core: true,
      });
    });
  });

  describe('startImageFlow', () => {
    it('extracts via OCR and returns a title/ingredients review', async () => {
      const draft = makeDraft({
        title: 'Bolo',
        ingredients: ['ovos'],
        wizardStep: WizardStep.REVISAR_TITULO_INGREDIENTES,
      });
      ocrService.extractRecipeFromImage.mockResolvedValue({
        title: 'Bolo',
        ingredients: ['ovos'],
        instructions: [],
        rawExtractedText: 'raw',
      });
      recipesService.createDraftFromExtraction.mockResolvedValue(draft);

      const result = await service.startImageFlow(
        '123',
        Buffer.from('x'),
        'image/jpeg',
      );

      expect(recipesService.createDraftFromExtraction).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({ title: 'Bolo' }),
        WizardStep.REVISAR_TITULO_INGREDIENTES,
      );
      expect(cache.get('123')?.captureType).toBe('imagem');
      expect(result).toEqual({
        kind: 'review',
        part: 'title_ingredients',
        draft,
      });
    });

    it('propagates OCR failures instead of swallowing them', async () => {
      ocrService.extractRecipeFromImage.mockRejectedValue(
        new Error('model unavailable'),
      );
      await expect(
        service.startImageFlow('123', Buffer.from('x'), 'image/jpeg'),
      ).rejects.toThrow('model unavailable');
      expect(cache.has('123')).toBe(false);
    });
  });

  describe('startLinkFlow', () => {
    it('scrapes the page and returns a title/ingredients review, carrying the source url', async () => {
      const draft = makeDraft({
        title: 'Receita',
        wizardStep: WizardStep.REVISAR_TITULO_INGREDIENTES,
      });
      scrapingService.scrapeUrl.mockResolvedValue({
        sourceUrl: 'https://example.com/receita',
        title: 'Receita',
        text: 'conteudo da pagina',
      });
      recipesService.createDraftFromExtraction.mockResolvedValue(draft);

      const result = await service.startLinkFlow(
        '123',
        'https://example.com/receita',
      );

      expect(recipesService.createDraftFromExtraction).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          title: 'Receita',
          ingredients: [],
          instructions: [],
        }),
        WizardStep.REVISAR_TITULO_INGREDIENTES,
        'https://example.com/receita',
      );
      expect(result).toEqual({
        kind: 'review',
        part: 'title_ingredients',
        draft,
      });
    });

    it('propagates scraping failures instead of swallowing them', async () => {
      scrapingService.scrapeUrl.mockRejectedValue(new Error('blocked'));
      await expect(
        service.startLinkFlow('123', 'http://127.0.0.1'),
      ).rejects.toThrow('blocked');
    });
  });

  describe('handleTextReply', () => {
    it('returns no_active_wizard when there is no session for the chat', async () => {
      await expect(service.handleTextReply('123', 'oi')).resolves.toEqual({
        kind: 'no_active_wizard',
      });
    });

    it('answers a draft-field step, persists it, and advances to the next step', async () => {
      cache.start('123', 'draft-1', WizardStep.NOME, 'texto');
      recipesService.getDraft.mockResolvedValue(makeDraft());
      recipesService.updateDraftField.mockResolvedValue(
        makeDraft({ title: 'Bolo de Cenoura' }),
      );

      const result = await service.handleTextReply('123', 'Bolo de Cenoura');

      expect(recipesService.updateDraftField).toHaveBeenCalledWith(
        '123',
        'draft-1',
        'title',
        'Bolo de Cenoura',
      );
      expect(cache.get('123')?.step).toBe(WizardStep.INGREDIENTES);
      expect(result).toEqual(
        expect.objectContaining({
          kind: 'prompt',
          step: WizardStep.INGREDIENTES,
        }),
      );
    });

    it('answers a collected-field-only step (observações) by merging into collected_fields', async () => {
      cache.start('123', 'draft-1', WizardStep.OBSERVACOES, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.OBSERVACOES }),
      );

      await service.handleTextReply('123', 'Sem glúten');

      expect(recipesService.updateWizardState).toHaveBeenCalledWith(
        '123',
        'draft-1',
        WizardStep.OBSERVACOES,
        { observacoes: 'Sem glúten' },
      );
    });

    it('returns a validation_error and does not advance when a draft field fails validation', async () => {
      cache.start('123', 'draft-1', WizardStep.LINK, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.LINK }),
      );
      recipesService.updateDraftField.mockRejectedValue(
        new DraftValidationException([
          'source_url must be a public http(s) URL',
        ]),
      );

      const result = await service.handleTextReply(
        '123',
        'http://127.0.0.1/admin',
      );

      expect(result.kind).toBe('validation_error');
      expect(cache.get('123')?.step).toBe(WizardStep.LINK);
    });

    it('returns a validation_error when a collected-field answer is too long, without persisting it', async () => {
      cache.start('123', 'draft-1', WizardStep.RENDIMENTO, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.RENDIMENTO }),
      );

      const result = await service.handleTextReply('123', 'a'.repeat(501));

      expect(result.kind).toBe('validation_error');
      expect(recipesService.updateWizardState).not.toHaveBeenCalled();
    });

    it('ignores free text on a review step and just re-shows it', async () => {
      cache.start(
        '123',
        'draft-1',
        WizardStep.REVISAR_TITULO_INGREDIENTES,
        'imagem',
      );
      const draft = makeDraft({
        wizardStep: WizardStep.REVISAR_TITULO_INGREDIENTES,
      });
      recipesService.getDraft.mockResolvedValue(draft);

      const result = await service.handleTextReply('123', 'texto qualquer');

      expect(result).toEqual({
        kind: 'review',
        part: 'title_ingredients',
        draft,
      });
      expect(recipesService.updateDraftField).not.toHaveBeenCalled();
    });

    it('reaching the last step lands on confirmation when no core fields are missing', async () => {
      cache.start('123', 'draft-1', WizardStep.TAGS, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.TAGS }),
      );
      recipesService.updateDraftField.mockResolvedValue(
        makeDraft({ tags: ['sobremesa'] }),
      );
      recipesService.getMissingCoreFields.mockReturnValue([]);

      const result = await service.handleTextReply('123', 'sobremesa');

      expect(result.kind).toBe('confirmation');
    });

    it('reaching the last step shows a soft_warning when core fields are still missing (US07 — never blocks)', async () => {
      cache.start('123', 'draft-1', WizardStep.TAGS, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.TAGS }),
      );
      recipesService.updateDraftField.mockResolvedValue(makeDraft());
      recipesService.getMissingCoreFields.mockReturnValue([
        'nome',
        'ingredientes',
      ]);

      const result = await service.handleTextReply('123', 'sobremesa');

      expect(result).toEqual(
        expect.objectContaining({
          kind: 'soft_warning',
          missingFields: ['nome', 'ingredientes'],
        }),
      );
    });
  });

  describe('skip', () => {
    it('advances to the next step without writing a value', async () => {
      cache.start('123', 'draft-1', WizardStep.NOME, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.NOME }),
      );

      const result = await service.skip('123');

      expect(recipesService.updateDraftField).not.toHaveBeenCalled();
      expect(cache.get('123')?.step).toBe(WizardStep.INGREDIENTES);
      expect(result.kind).toBe('prompt');
    });

    it('lets a core step be skipped just like an optional one (US07 — nothing hard-blocks)', async () => {
      cache.start('123', 'draft-1', WizardStep.INGREDIENTES, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.INGREDIENTES }),
      );

      const result = await service.skip('123');

      expect(cache.get('123')?.step).toBe(WizardStep.MODO_PREPARO);
      expect(result.kind).not.toBe('validation_error');
    });
  });

  describe('handleReviewAction', () => {
    it('confirming title_ingredients moves to the instructions review', async () => {
      cache.start(
        '123',
        'draft-1',
        WizardStep.REVISAR_TITULO_INGREDIENTES,
        'imagem',
      );
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.REVISAR_TITULO_INGREDIENTES }),
      );

      const result = await service.handleReviewAction(
        '123',
        'confirm',
        'title_ingredients',
      );

      expect(cache.get('123')?.step).toBe(WizardStep.REVISAR_MODO_PREPARO);
      expect(result.kind).toBe('review');
    });

    it('confirming instructions moves to the first optional linear step (observações)', async () => {
      cache.start('123', 'draft-1', WizardStep.REVISAR_MODO_PREPARO, 'imagem');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.REVISAR_MODO_PREPARO }),
      );

      const result = await service.handleReviewAction(
        '123',
        'confirm',
        'instructions',
      );

      expect(cache.get('123')?.step).toBe(WizardStep.OBSERVACOES);
      expect(result.kind).toBe('prompt');
    });

    it('editing title_ingredients jumps to nome and marks a review-return for later', async () => {
      cache.start(
        '123',
        'draft-1',
        WizardStep.REVISAR_TITULO_INGREDIENTES,
        'imagem',
      );
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.REVISAR_TITULO_INGREDIENTES }),
      );

      const result = await service.handleReviewAction(
        '123',
        'edit',
        'title_ingredients',
      );

      expect(cache.get('123')?.step).toBe(WizardStep.NOME);
      expect(recipesService.updateWizardState).toHaveBeenCalledWith(
        '123',
        'draft-1',
        WizardStep.NOME,
        { __reviewReturn: 'title_ingredients' },
      );
      expect(result.kind).toBe('prompt');
    });

    it('editing instructions jumps straight to modo_preparo without a review-return marker', async () => {
      cache.start('123', 'draft-1', WizardStep.REVISAR_MODO_PREPARO, 'imagem');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.REVISAR_MODO_PREPARO }),
      );

      await service.handleReviewAction('123', 'edit', 'instructions');

      expect(cache.get('123')?.step).toBe(WizardStep.MODO_PREPARO);
      expect(recipesService.updateWizardState).toHaveBeenCalledWith(
        '123',
        'draft-1',
        WizardStep.MODO_PREPARO,
        {},
      );
    });

    it('after editing title_ingredients, finishing nome+ingredientes returns to the instructions review — not modo_preparo', async () => {
      cache.start(
        '123',
        'draft-1',
        WizardStep.REVISAR_TITULO_INGREDIENTES,
        'imagem',
      );
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.REVISAR_TITULO_INGREDIENTES }),
      );
      await service.handleReviewAction('123', 'edit', 'title_ingredients');
      // cache.get('123').step is now NOME, collected_fields has __reviewReturn.

      recipesService.getDraft.mockResolvedValue(
        makeDraft({
          wizardStep: WizardStep.NOME,
          collectedFields: { __reviewReturn: 'title_ingredients' },
        }),
      );
      recipesService.updateDraftField.mockResolvedValue(
        makeDraft({
          title: 'Bolo',
          wizardStep: WizardStep.NOME,
          collectedFields: { __reviewReturn: 'title_ingredients' },
        }),
      );
      await service.handleTextReply('123', 'Bolo');
      expect(cache.get('123')?.step).toBe(WizardStep.INGREDIENTES);

      recipesService.getDraft.mockResolvedValue(
        makeDraft({
          wizardStep: WizardStep.INGREDIENTES,
          collectedFields: { __reviewReturn: 'title_ingredients' },
        }),
      );
      recipesService.updateDraftField.mockResolvedValue(
        makeDraft({
          ingredients: ['ovos'],
          wizardStep: WizardStep.INGREDIENTES,
          collectedFields: { __reviewReturn: 'title_ingredients' },
        }),
      );
      const finalResult = await service.handleTextReply('123', 'ovos');

      expect(cache.get('123')?.step).toBe(WizardStep.REVISAR_MODO_PREPARO);
      expect(finalResult.kind).toBe('review');
      // The marker must not leak back into the persisted collected_fields.
      const [, , , persisted] =
        recipesService.updateWizardState.mock.calls.at(-1)!;
      expect(persisted).not.toHaveProperty('__reviewReturn');
    });
  });

  describe('listBackSteps / listForwardSteps', () => {
    it('lists only steps before the current one for /retroceder, with answered flags', async () => {
      cache.start('123', 'draft-1', WizardStep.MODO_PREPARO, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({
          title: 'Bolo',
          ingredients: [],
          wizardStep: WizardStep.MODO_PREPARO,
        }),
      );

      const result = await service.listBackSteps('123');

      expect(result.kind).toBe('step_list');
      if (result.kind === 'step_list') {
        expect(result.mode).toBe('back');
        expect(result.entries.map((e) => e.step)).toEqual([
          WizardStep.NOME,
          WizardStep.INGREDIENTES,
        ]);
        expect(result.entries[0].answered).toBe(true);
        expect(result.entries[1].answered).toBe(false);
      }
    });

    it('lists only steps after the current one for /avancar', async () => {
      cache.start('123', 'draft-1', WizardStep.OBSERVACOES, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({ wizardStep: WizardStep.OBSERVACOES }),
      );

      const result = await service.listForwardSteps('123');

      expect(result.kind).toBe('step_list');
      if (result.kind === 'step_list') {
        expect(result.mode).toBe('forward');
        expect(result.entries.map((e) => e.step)).toEqual([
          WizardStep.RENDIMENTO,
          WizardStep.TEMPO_PREPARO,
          WizardStep.LINK,
          WizardStep.TAGS,
        ]);
      }
    });
  });

  describe('goBackTo', () => {
    it('clears the target step and everything after it, then lands on the target', async () => {
      cache.start('123', 'draft-1', WizardStep.TAGS, 'texto');
      const draft = makeDraft({
        title: 'Bolo',
        ingredients: ['ovos'],
        instructions: ['misturar'],
        wizardStep: WizardStep.TAGS,
      });
      recipesService.getDraft.mockResolvedValue(draft);
      recipesService.clearDraftFields.mockResolvedValue(
        makeDraft({ title: 'Bolo', ingredients: [], instructions: [] }),
      );

      const result = await service.goBackTo('123', WizardStep.INGREDIENTES);

      expect(recipesService.clearDraftFields).toHaveBeenCalledWith(
        '123',
        'draft-1',
        ['ingredients', 'instructions', 'source_url', 'tags'],
      );
      expect(cache.get('123')?.step).toBe(WizardStep.INGREDIENTES);
      expect(result.kind).toBe('prompt');
    });
  });

  describe('goForwardTo', () => {
    it('clears only the steps skipped over (current through target, exclusive of target)', async () => {
      cache.start('123', 'draft-1', WizardStep.OBSERVACOES, 'texto');
      const draft = makeDraft({ wizardStep: WizardStep.OBSERVACOES });
      recipesService.getDraft.mockResolvedValue(draft);

      await service.goForwardTo('123', WizardStep.LINK);

      // observacoes/rendimento/tempo_preparo are collected-only fields; none of them are draftFields.
      expect(recipesService.clearDraftFields).not.toHaveBeenCalled();
      expect(cache.get('123')?.step).toBe(WizardStep.LINK);
    });

    it('clears typed draft fields when they fall inside the skipped range', async () => {
      cache.start('123', 'draft-1', WizardStep.NOME, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({
          title: 'x',
          ingredients: ['y'],
          wizardStep: WizardStep.NOME,
        }),
      );

      await service.goForwardTo('123', WizardStep.MODO_PREPARO);

      expect(recipesService.clearDraftFields).toHaveBeenCalledWith(
        '123',
        'draft-1',
        ['title', 'ingredients'],
      );
    });
  });

  describe('completeNow', () => {
    it('jumps to the first missing core field, in nome/ingredientes/modo_preparo order', async () => {
      cache.start('123', 'draft-1', WizardStep.CONFIRMACAO, 'texto');
      recipesService.getDraft.mockResolvedValue(
        makeDraft({
          title: 'Bolo',
          ingredients: [],
          wizardStep: WizardStep.CONFIRMACAO,
        }),
      );

      const result = await service.completeNow('123');

      expect(cache.get('123')?.step).toBe(WizardStep.INGREDIENTES);
      expect(result).toEqual(
        expect.objectContaining({
          kind: 'prompt',
          step: WizardStep.INGREDIENTES,
        }),
      );
    });
  });

  describe('save / saveAnyway / cancel', () => {
    it('save() confirms strictly and clears the session', async () => {
      cache.start('123', 'draft-1', WizardStep.CONFIRMACAO, 'texto');
      const recipe = makeRecipe();
      recipesService.confirmDraft.mockResolvedValue(recipe);

      const result = await service.save('123');

      expect(recipesService.confirmDraft).toHaveBeenCalledWith(
        '123',
        'draft-1',
        false,
      );
      expect(cache.has('123')).toBe(false);
      expect(result).toEqual({ kind: 'saved', recipe });
    });

    it('saveAnyway() allows incomplete core fields and clears the session', async () => {
      cache.start('123', 'draft-1', WizardStep.CONFIRMACAO, 'texto');
      recipesService.confirmDraft.mockResolvedValue(makeRecipe());

      await service.saveAnyway('123');

      expect(recipesService.confirmDraft).toHaveBeenCalledWith(
        '123',
        'draft-1',
        true,
      );
      expect(cache.has('123')).toBe(false);
    });

    it('cancel() rejects the draft and clears the session', async () => {
      cache.start('123', 'draft-1', WizardStep.NOME, 'texto');

      const result = await service.cancel('123');

      expect(recipesService.rejectDraft).toHaveBeenCalledWith('123', 'draft-1');
      expect(cache.has('123')).toBe(false);
      expect(result).toEqual({ kind: 'cancelled' });
    });

    it.each([
      ['save', () => service.save('123')],
      ['saveAnyway', () => service.saveAnyway('123')],
      ['cancel', () => service.cancel('123')],
    ])(
      '%s returns no_active_wizard when there is no session',
      async (_name, run) => {
        await expect(run()).resolves.toEqual({ kind: 'no_active_wizard' });
      },
    );
  });

  describe('checkResumeOffer', () => {
    it('returns null when a session is already active', async () => {
      cache.start('123', 'draft-1', WizardStep.NOME, 'texto');
      expect(await service.checkResumeOffer('123')).toBeNull();
      expect(recipesService.findLatestInProgressDraft).not.toHaveBeenCalled();
    });

    it('returns null when there is no in-progress draft either', async () => {
      recipesService.findLatestInProgressDraft.mockResolvedValue(null);
      expect(await service.checkResumeOffer('123')).toBeNull();
    });

    it('offers to resume when the cache is empty but a draft is still in progress (US08)', async () => {
      const draft = makeDraft({ wizardStep: WizardStep.TAGS });
      recipesService.findLatestInProgressDraft.mockResolvedValue(draft);

      expect(await service.checkResumeOffer('123')).toEqual({
        kind: 'resume_offer',
        draft,
      });
    });
  });

  describe('resume', () => {
    it('restarts the cache session from the persisted step and re-shows it', async () => {
      const draft = makeDraft({
        title: 'Bolo',
        wizardStep: WizardStep.INGREDIENTES,
      });
      recipesService.findLatestInProgressDraft.mockResolvedValue(draft);

      const result = await service.resume('123');

      expect(cache.get('123')).toEqual(
        expect.objectContaining({
          draftId: 'draft-1',
          step: WizardStep.INGREDIENTES,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          kind: 'prompt',
          step: WizardStep.INGREDIENTES,
        }),
      );
    });

    it('returns no_active_wizard when there is nothing to resume', async () => {
      recipesService.findLatestInProgressDraft.mockResolvedValue(null);
      expect(await service.resume('123')).toEqual({ kind: 'no_active_wizard' });
    });
  });

  describe('restart', () => {
    it('discards the stale draft and returns the entry menu', async () => {
      const draft = makeDraft();
      recipesService.findLatestInProgressDraft.mockResolvedValue(draft);

      const result = await service.restart('123');

      expect(recipesService.rejectDraft).toHaveBeenCalledWith('123', 'draft-1');
      expect(result).toEqual({ kind: 'entry_menu' });
    });

    it('still returns the entry menu when there was nothing to discard', async () => {
      recipesService.findLatestInProgressDraft.mockResolvedValue(null);
      const result = await service.restart('123');
      expect(recipesService.rejectDraft).not.toHaveBeenCalled();
      expect(result).toEqual({ kind: 'entry_menu' });
    });
  });
});
