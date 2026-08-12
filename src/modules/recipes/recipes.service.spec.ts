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
      updateFields: jest.fn(),
      updateState: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<DraftsRepository>;
    recipesRepository = {
      create: jest.fn(),
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

  describe('createDraftFromExtraction', () => {
    it('creates a draft with empty tags and no source url from OCR extraction', async () => {
      draftsRepository.create.mockResolvedValue(makeDraft());

      await service.createDraftFromExtraction('123', {
        title: 'Bolo',
        ingredients: ['a'],
        instructions: ['b'],
        rawExtractedText: 'raw',
      });

      expect(draftsRepository.create).toHaveBeenCalledWith({
        chatId: '123',
        title: 'Bolo',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
        sourceUrl: null,
        rawExtractedText: 'raw',
      });
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
    it('rejects confirmation when required fields are missing', async () => {
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
