import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/common/database/database.module';
import { DatabaseService } from '../../src/common/database/database.service';
import { RecipesModule } from '../../src/modules/recipes/recipes.module';
import { DraftsRepository } from '../../src/modules/recipes/drafts.repository';
import { RecipesRepository } from '../../src/modules/recipes/recipes.repository';
import { RecipesService } from '../../src/modules/recipes/recipes.service';
import { EmbeddingService } from '../../src/modules/rag/embedding.service';
import { DraftState } from '../../src/modules/recipes/enums/draft-state.enum';
import { DraftValidationException } from '../../src/modules/recipes/exceptions/draft-validation.exception';
import { EMBEDDING_DIMENSIONS } from '../../src/modules/rag/rag.constants';

/**
 * Exercises DraftsRepository/RecipesRepository against the real
 * dockerized Postgres (`docker compose up -d postgres`) — these are new,
 * SQL-writing repositories that only have mocked-DB unit tests so far.
 * Only EmbeddingService is faked; the transactional insert-then-delete
 * in RecipesService.confirmDraft runs against a real connection.
 */

process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/recipbot?schema=public';
process.env.NODE_ENV ??= 'test';

// telegram_chat_id must match the numeric-chat-id pattern enforced by
// CreateRecipeDto/QueryRecipesDto — a descriptive string would fail
// DTO validation the moment confirmDraft() constructs a CreateRecipeDto.
const CHAT_ID = '900000000001';
const OTHER_CHAT_ID = '900000000002';

describe('Drafts & Recipes repositories (integration)', () => {
  let moduleRef: TestingModule;
  let db: DatabaseService;
  let draftsRepository: DraftsRepository;
  let recipesRepository: RecipesRepository;
  let recipesService: RecipesService;
  let embeddingService: { embedDocument: jest.Mock };
  const draftIds: string[] = [];
  const recipeIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        RecipesModule,
      ],
    })
      .overrideProvider(EmbeddingService)
      .useValue({ embedDocument: jest.fn(), embedQuery: jest.fn() })
      .compile();

    db = moduleRef.get(DatabaseService);
    draftsRepository = moduleRef.get(DraftsRepository);
    recipesRepository = moduleRef.get(RecipesRepository);
    recipesService = moduleRef.get(RecipesService);
    embeddingService = moduleRef.get(EmbeddingService) as unknown as {
      embedDocument: jest.Mock;
    };
  });

  beforeEach(() => {
    embeddingService.embedDocument.mockClear();
  });

  afterAll(async () => {
    if (db) {
      if (draftIds.length > 0) {
        await db.query('DELETE FROM recipe_drafts WHERE id = ANY($1::uuid[])', [
          draftIds,
        ]);
      }
      if (recipeIds.length > 0) {
        await db.query('DELETE FROM recipes WHERE id = ANY($1::uuid[])', [
          recipeIds,
        ]);
      }
    }
    await moduleRef?.close();
  });

  async function createTestDraft(
    overrides: Partial<{
      chatId: string;
      title: string | null;
      ingredients: string[];
      instructions: string[];
      tags: string[];
      sourceUrl: string | null;
      rawExtractedText: string | null;
    }> = {},
  ) {
    const draft = await draftsRepository.create({
      chatId: CHAT_ID,
      title: 'Bolo de Cenoura',
      ingredients: ['2 cenouras'],
      instructions: ['Asse por 40 min'],
      tags: ['sobremesa'],
      sourceUrl: null,
      rawExtractedText: 'raw text',
      ...overrides,
    });
    draftIds.push(draft.id);
    return draft;
  }

  describe('DraftsRepository', () => {
    it('creates a draft defaulting to PENDING_CONFIRMATION and reads it back scoped to the chat', async () => {
      const created = await createTestDraft();

      expect(created.state).toBe(DraftState.PENDING_CONFIRMATION);

      const found = await draftsRepository.findById(created.id, CHAT_ID);
      expect(found).toEqual(created);
    });

    it('never returns a draft when queried with the wrong chat id', async () => {
      const created = await createTestDraft();

      expect(
        await draftsRepository.findById(created.id, OTHER_CHAT_ID),
      ).toBeNull();
    });

    it('updateFields only changes the provided columns', async () => {
      const created = await createTestDraft();

      const updated = await draftsRepository.updateFields(created.id, CHAT_ID, {
        title: 'Novo Titulo',
      });

      expect(updated?.title).toBe('Novo Titulo');
      expect(updated?.ingredients).toEqual(created.ingredients);
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });

    it('updateFields scoped to another chat id updates nothing', async () => {
      const created = await createTestDraft();

      const result = await draftsRepository.updateFields(
        created.id,
        OTHER_CHAT_ID,
        {
          title: 'Should not apply',
        },
      );

      expect(result).toBeNull();
      const stillOriginal = await draftsRepository.findById(
        created.id,
        CHAT_ID,
      );
      expect(stillOriginal?.title).toBe(created.title);
    });

    it('updateState transitions the draft state', async () => {
      const created = await createTestDraft();

      const updated = await draftsRepository.updateState(
        created.id,
        CHAT_ID,
        DraftState.REJECTED,
      );

      expect(updated?.state).toBe(DraftState.REJECTED);
    });

    it('delete removes the row', async () => {
      const created = await createTestDraft();

      await draftsRepository.delete(created.id, CHAT_ID);

      expect(await draftsRepository.findById(created.id, CHAT_ID)).toBeNull();
    });
  });

  describe('RecipesService.confirmDraft (transactional insert + delete)', () => {
    it('inserts a recipe with the computed embedding and deletes the draft, atomically', async () => {
      const draft = await createTestDraft();
      const embedding = Array.from(
        { length: EMBEDDING_DIMENSIONS },
        () => 0.25,
      );
      embeddingService.embedDocument.mockResolvedValueOnce(embedding);

      const recipe = await recipesService.confirmDraft(CHAT_ID, draft.id);
      recipeIds.push(recipe.id);

      expect(recipe.title).toBe(draft.title);
      expect(await draftsRepository.findById(draft.id, CHAT_ID)).toBeNull();

      const rows = await db.query<{ embedding: string | null }>(
        'SELECT embedding FROM recipes WHERE id = $1',
        [recipe.id],
      );
      expect(rows[0].embedding).not.toBeNull();
    });

    it('rejects confirmation of an incomplete draft and leaves it untouched', async () => {
      const draft = await createTestDraft({
        title: null,
        ingredients: [],
        instructions: [],
      });

      await expect(
        recipesService.confirmDraft(CHAT_ID, draft.id),
      ).rejects.toThrow(DraftValidationException);

      expect(embeddingService.embedDocument).not.toHaveBeenCalled();
      expect(await draftsRepository.findById(draft.id, CHAT_ID)).not.toBeNull();
    });
  });

  describe('RecipesService.rejectDraft', () => {
    it('deletes the draft', async () => {
      const draft = await createTestDraft();

      await recipesService.rejectDraft(CHAT_ID, draft.id);

      expect(await draftsRepository.findById(draft.id, CHAT_ID)).toBeNull();
    });
  });

  describe('RecipesRepository', () => {
    it('creates a recipe without an embedding when none is provided', async () => {
      const recipe = await recipesRepository.create({
        chatId: CHAT_ID,
        title: 'Salada Simples',
        ingredients: ['alface'],
        instructions: ['misturar'],
        tags: [],
        sourceUrl: null,
        embedding: null,
      });
      recipeIds.push(recipe.id);

      const rows = await db.query<{ embedding: string | null }>(
        'SELECT embedding FROM recipes WHERE id = $1',
        [recipe.id],
      );
      expect(rows[0].embedding).toBeNull();
    });
  });
});
