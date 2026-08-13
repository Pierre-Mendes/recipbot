import { RecipesService } from './recipes.service';
import {
  DatabaseService,
  Queryable,
} from '../../common/database/database.service';
import { DraftsRepository } from './drafts.repository';
import { RecipesRepository } from './recipes.repository';
import { EmbeddingService } from '../rag/embedding.service';
import { DraftState } from './enums/draft-state.enum';
import { DraftNotFoundException } from './exceptions/draft-not-found.exception';
import { DraftValidationException } from './exceptions/draft-validation.exception';
import { RecipeDraft } from './interfaces/draft.interface';

function makeDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    id: 'draft-1',
    telegramChatId: '123',
    state: DraftState.PENDING_CONFIRMATION,
    title: 'Bolo de Cenoura',
    ingredients: ['2 cenouras'],
    instructions: ['Asse por 40 min'],
    tags: ['sobremesa'],
    sourceUrl: null,
    rawExtractedText: 'raw',
    wizardStep: null,
    collectedFields: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RecipesService', () => {
  let db: jest.Mocked<DatabaseService>;
  let draftsRepository: jest.Mocked<DraftsRepository>;
  let recipesRepository: jest.Mocked<RecipesRepository>;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let service: RecipesService;
  let txQueryable: Queryable;

  beforeEach(() => {
    txQueryable = { query: jest.fn() };
    db = {
      withTransaction: jest.fn((work: (q: Queryable) => unknown) =>
        work(txQueryable),
      ),
    } as unknown as jest.Mocked<DatabaseService>;
    draftsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findLatestInProgress: jest.fn(),
      existsForChat: jest.fn(),
      updateFields: jest.fn(),
      clearFields: jest.fn(),
      updateWizardState: jest.fn(),
      updateState: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<DraftsRepository>;
    recipesRepository = {
      create: jest.fn(),
      existsForChat: jest.fn(),
    } as unknown as jest.Mocked<RecipesRepository>;
    embeddingService = {
      embedDocument: jest.fn(),
      embedQuery: jest.fn(),
    } as unknown as jest.Mocked<EmbeddingService>;

    service = new RecipesService(
      db,
      draftsRepository,
      recipesRepository,
      embeddingService,
    );
  });

  describe('hasHistory', () => {
    it('is false when neither drafts nor recipes exist for the chat', async () => {
      draftsRepository.existsForChat.mockResolvedValue(false);
      recipesRepository.existsForChat.mockResolvedValue(false);

      expect(await service.hasHistory('123')).toBe(false);
    });

    it.each([
      [true, false],
      [false, true],
      [true, true],
    ])(
      'is true when drafts=%s or recipes=%s exist',
      async (hasDrafts, hasRecipes) => {
        draftsRepository.existsForChat.mockResolvedValue(hasDrafts);
        recipesRepository.existsForChat.mockResolvedValue(hasRecipes);

        expect(await service.hasHistory('123')).toBe(true);
      },
    );
  });

  describe('createEmptyDraft', () => {
    it('creates a blank draft at the given wizard step', async () => {
      draftsRepository.create.mockResolvedValue(makeDraft());

      await service.createEmptyDraft('123', 'nome');

      expect(draftsRepository.create).toHaveBeenCalledWith({
        chatId: '123',
        title: null,
        ingredients: [],
        instructions: [],
        tags: [],
        sourceUrl: null,
        rawExtractedText: null,
        wizardStep: 'nome',
        collectedFields: {},
      });
    });
  });

  describe('createDraftFromExtraction', () => {
    it('creates a draft with empty tags, the given wizard step, and no source url by default', async () => {
      draftsRepository.create.mockResolvedValue(makeDraft());

      await service.createDraftFromExtraction(
        '123',
        {
          title: 'Bolo',
          ingredients: ['a'],
          instructions: ['b'],
          rawExtractedText: 'raw',
        },
        'revisar_titulo_ingredientes',
      );

      expect(draftsRepository.create).toHaveBeenCalledWith({
        chatId: '123',
        title: 'Bolo',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
        sourceUrl: null,
        rawExtractedText: 'raw',
        wizardStep: 'revisar_titulo_ingredientes',
        collectedFields: {},
      });
    });

    it('carries a source url through when provided (link flow)', async () => {
      draftsRepository.create.mockResolvedValue(makeDraft());

      await service.createDraftFromExtraction(
        '123',
        {
          title: null,
          ingredients: [],
          instructions: [],
          rawExtractedText: 'texto da página',
        },
        'revisar_titulo_ingredientes',
        'https://example.com/receita',
      );

      expect(draftsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sourceUrl: 'https://example.com/receita' }),
      );
    });
  });

  describe('getDraft', () => {
    it('returns the draft when found and owned by the chat', async () => {
      const draft = makeDraft();
      draftsRepository.findById.mockResolvedValue(draft);

      await expect(service.getDraft('123', 'draft-1')).resolves.toBe(draft);
    });

    it('throws DraftNotFoundException when missing', async () => {
      draftsRepository.findById.mockResolvedValue(null);
      await expect(service.getDraft('123', 'missing')).rejects.toThrow(
        DraftNotFoundException,
      );
    });
  });

  describe('findLatestInProgressDraft', () => {
    it('passes through to the repository', async () => {
      const draft = makeDraft({ wizardStep: 'tags' });
      draftsRepository.findLatestInProgress.mockResolvedValue(draft);

      await expect(service.findLatestInProgressDraft('123')).resolves.toBe(
        draft,
      );
      expect(draftsRepository.findLatestInProgress).toHaveBeenCalledWith('123');
    });
  });

  describe('updateWizardState', () => {
    it('persists the step and collected fields', async () => {
      const updated = makeDraft({ wizardStep: 'observacoes' });
      draftsRepository.updateWizardState.mockResolvedValue(updated);

      const result = await service.updateWizardState(
        '123',
        'draft-1',
        'observacoes',
        {
          rendimento: '4 porções',
        },
      );

      expect(draftsRepository.updateWizardState).toHaveBeenCalledWith(
        'draft-1',
        '123',
        'observacoes',
        { rendimento: '4 porções' },
      );
      expect(result).toBe(updated);
    });

    it('throws DraftNotFoundException when the draft does not belong to the chat', async () => {
      draftsRepository.updateWizardState.mockResolvedValue(null);
      await expect(
        service.updateWizardState('123', 'draft-1', 'observacoes', {}),
      ).rejects.toThrow(DraftNotFoundException);
    });
  });

  describe('clearDraftFields', () => {
    it('passes through to the repository', async () => {
      const updated = makeDraft({ title: null });
      draftsRepository.clearFields.mockResolvedValue(updated);

      const result = await service.clearDraftFields('123', 'draft-1', [
        'title',
      ]);

      expect(draftsRepository.clearFields).toHaveBeenCalledWith(
        'draft-1',
        '123',
        ['title'],
      );
      expect(result).toBe(updated);
    });

    it('throws DraftNotFoundException when the draft does not belong to the chat', async () => {
      draftsRepository.clearFields.mockResolvedValue(null);
      await expect(
        service.clearDraftFields('123', 'draft-1', ['title']),
      ).rejects.toThrow(DraftNotFoundException);
    });
  });

  describe('getMissingCoreFields', () => {
    it('returns an empty array when nome/ingredientes/modo de preparo are all present', () => {
      expect(service.getMissingCoreFields(makeDraft())).toEqual([]);
    });

    it('lists pt-BR labels for each missing core field', () => {
      const draft = makeDraft({
        title: null,
        ingredients: [],
        instructions: ['ok'],
      });
      expect(service.getMissingCoreFields(draft)).toEqual([
        'nome',
        'ingredientes',
      ]);
    });

    it('treats a whitespace-only title as missing', () => {
      const draft = makeDraft({ title: '   ' });
      expect(service.getMissingCoreFields(draft)).toContain('nome');
    });
  });

  describe('updateDraftField', () => {
    it('parses, validates, and persists a valid field update', async () => {
      draftsRepository.findById.mockResolvedValue(makeDraft());
      draftsRepository.updateFields.mockResolvedValue(
        makeDraft({ title: 'New Title' }),
      );

      const result = await service.updateDraftField(
        '123',
        'draft-1',
        'title',
        '  New Title  ',
      );

      expect(draftsRepository.updateFields).toHaveBeenCalledWith(
        'draft-1',
        '123',
        {
          title: 'New Title',
        },
      );
      expect(result.title).toBe('New Title');
    });

    it('rejects a tag that fails the DTO pattern instead of persisting it', async () => {
      draftsRepository.findById.mockResolvedValue(makeDraft());

      await expect(
        service.updateDraftField(
          '123',
          'draft-1',
          'tags',
          'Invalid Tag With Spaces!',
        ),
      ).rejects.toThrow(DraftValidationException);
      expect(draftsRepository.updateFields).not.toHaveBeenCalled();
    });

    it('rejects a private/internal source_url (SSRF guard on link editing)', async () => {
      draftsRepository.findById.mockResolvedValue(makeDraft());

      await expect(
        service.updateDraftField(
          '123',
          'draft-1',
          'source_url',
          'http://127.0.0.1/admin',
        ),
      ).rejects.toThrow(DraftValidationException);
      expect(draftsRepository.updateFields).not.toHaveBeenCalled();
    });

    it('throws DraftNotFoundException if the draft disappears before the update lands', async () => {
      draftsRepository.findById.mockResolvedValue(makeDraft());
      draftsRepository.updateFields.mockResolvedValue(null);

      await expect(
        service.updateDraftField('123', 'draft-1', 'title', 'New Title'),
      ).rejects.toThrow(DraftNotFoundException);
    });

    it('throws DraftNotFoundException up front when the draft does not belong to the chat', async () => {
      draftsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateDraftField('123', 'draft-1', 'title', 'New Title'),
      ).rejects.toThrow(DraftNotFoundException);
      expect(draftsRepository.updateFields).not.toHaveBeenCalled();
    });
  });

  describe('confirmDraft', () => {
    it('rejects confirmation when required fields are missing and allowIncomplete is false', async () => {
      draftsRepository.findById.mockResolvedValue(
        makeDraft({ title: null, ingredients: [], instructions: [] }),
      );

      await expect(service.confirmDraft('123', 'draft-1')).rejects.toThrow(
        DraftValidationException,
      );
      expect(embeddingService.embedDocument).not.toHaveBeenCalled();
      expect(db.withTransaction).not.toHaveBeenCalled();
    });

    it('computes an embedding and transactionally creates the recipe then deletes the draft', async () => {
      const draft = makeDraft();
      draftsRepository.findById.mockResolvedValue(draft);
      embeddingService.embedDocument.mockResolvedValue([0.1, 0.2]);
      recipesRepository.create.mockResolvedValue({
        id: 'recipe-1',
        telegramChatId: '123',
        title: draft.title!,
        ingredients: draft.ingredients,
        instructions: draft.instructions,
        tags: draft.tags,
        sourceUrl: null,
        createdAt: new Date(),
      });

      const recipe = await service.confirmDraft('123', 'draft-1');

      expect(embeddingService.embedDocument).toHaveBeenCalledWith(
        expect.stringContaining('Bolo de Cenoura'),
      );
      expect(db.withTransaction).toHaveBeenCalled();
      expect(recipesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ chatId: '123', embedding: [0.1, 0.2] }),
        txQueryable,
      );
      expect(draftsRepository.delete).toHaveBeenCalledWith(
        'draft-1',
        '123',
        txQueryable,
      );
      expect(recipe.id).toBe('recipe-1');
    });

    it('allowIncomplete=true saves successfully even with every core field empty (US07 — never blocks)', async () => {
      const draft = makeDraft({
        title: null,
        ingredients: [],
        instructions: [],
        tags: [],
      });
      draftsRepository.findById.mockResolvedValue(draft);
      recipesRepository.create.mockResolvedValue({
        id: 'recipe-1',
        telegramChatId: '123',
        title: '',
        ingredients: [],
        instructions: [],
        tags: [],
        sourceUrl: null,
        createdAt: new Date(),
      });

      const recipe = await service.confirmDraft('123', 'draft-1', true);

      expect(recipe.id).toBe('recipe-1');
      // Nothing to embed when every field is blank — must not call the embedding API with empty text.
      expect(embeddingService.embedDocument).not.toHaveBeenCalled();
    });

    it('allowIncomplete=true still rejects a genuine non-emptiness violation (e.g. an invalid tag)', async () => {
      const draft = makeDraft({ tags: ['Not Valid!'] });
      draftsRepository.findById.mockResolvedValue(draft);

      await expect(
        service.confirmDraft('123', 'draft-1', true),
      ).rejects.toThrow(DraftValidationException);
      expect(db.withTransaction).not.toHaveBeenCalled();
    });
  });

  describe('rejectDraft', () => {
    it('marks the draft rejected and then deletes it', async () => {
      draftsRepository.updateState.mockResolvedValue(
        makeDraft({ state: DraftState.REJECTED }),
      );

      await service.rejectDraft('123', 'draft-1');

      expect(draftsRepository.updateState).toHaveBeenCalledWith(
        'draft-1',
        '123',
        DraftState.REJECTED,
      );
      expect(draftsRepository.delete).toHaveBeenCalledWith('draft-1', '123');
    });

    it('throws DraftNotFoundException when the draft does not belong to the chat', async () => {
      draftsRepository.updateState.mockResolvedValue(null);

      await expect(service.rejectDraft('123', 'draft-1')).rejects.toThrow(
        DraftNotFoundException,
      );
      expect(draftsRepository.delete).not.toHaveBeenCalled();
    });
  });
});
