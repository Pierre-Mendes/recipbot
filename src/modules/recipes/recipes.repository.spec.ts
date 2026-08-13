import { RecipesRepository } from './recipes.repository';
import { DatabaseService } from '../../common/database/database.service';
import { EMBEDDING_DIMENSIONS } from '../rag/rag.constants';

const dbRow = {
  id: 'recipe-1',
  telegram_chat_id: '123',
  title: 'Bolo de Cenoura',
  ingredients: ['cenoura'],
  instructions: ['assar'],
  tags: ['sobremesa'],
  source_url: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
};

describe('RecipesRepository', () => {
  let db: jest.Mocked<DatabaseService>;
  let repository: RecipesRepository;

  beforeEach(() => {
    db = { query: jest.fn() } as unknown as jest.Mocked<DatabaseService>;
    repository = new RecipesRepository(db);
  });

  it('maps a created row to a Recipe', async () => {
    db.query.mockResolvedValue([dbRow]);

    const recipe = await repository.create({
      chatId: '123',
      title: 'Bolo de Cenoura',
      ingredients: ['cenoura'],
      instructions: ['assar'],
      tags: ['sobremesa'],
      sourceUrl: null,
      embedding: null,
    });

    expect(recipe).toEqual({
      id: 'recipe-1',
      telegramChatId: '123',
      title: 'Bolo de Cenoura',
      ingredients: ['cenoura'],
      instructions: ['assar'],
      tags: ['sobremesa'],
      sourceUrl: null,
      createdAt: dbRow.created_at,
    });
  });

  it('passes null through for a missing embedding', async () => {
    db.query.mockResolvedValue([dbRow]);

    await repository.create({
      chatId: '123',
      title: 'Bolo',
      ingredients: [],
      instructions: [],
      tags: [],
      sourceUrl: null,
      embedding: null,
    });

    const [, params] = db.query.mock.calls[0];
    expect(params![6]).toBeNull();
  });

  it('serializes a provided embedding into a pgvector literal', async () => {
    db.query.mockResolvedValue([dbRow]);
    const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1);

    await repository.create({
      chatId: '123',
      title: 'Bolo',
      ingredients: [],
      instructions: [],
      tags: [],
      sourceUrl: null,
      embedding,
    });

    const [, params] = db.query.mock.calls[0];
    expect(params![6]).toBe(`[${embedding.join(',')}]`);
  });

  describe('existsForChat', () => {
    it('returns true when the query reports a match', async () => {
      db.query.mockResolvedValue([{ exists: true }]);
      expect(await repository.existsForChat('123')).toBe(true);
    });

    it('returns false when there is no row at all', async () => {
      db.query.mockResolvedValue([]);
      expect(await repository.existsForChat('123')).toBe(false);
    });
  });
});
