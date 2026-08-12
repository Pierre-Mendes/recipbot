import { RecipeSearchRepository } from './recipe-search.repository';
import { DatabaseService } from '../../common/database/database.service';
import { EMBEDDING_DIMENSIONS } from './rag.constants';

function makeEmbedding(fill: number): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => fill);
}

describe('RecipeSearchRepository', () => {
  let db: jest.Mocked<DatabaseService>;
  let repository: RecipeSearchRepository;

  const dbRow = {
    id: 'recipe-1',
    title: 'Bolo de Cenoura',
    ingredients: ['cenoura', 'ovos'],
    instructions: ['misturar', 'assar'],
    tags: ['sobremesa'],
    source_url: 'https://example.com/bolo',
    created_at: new Date('2026-01-01T00:00:00Z'),
    similarity: 0.87,
  };

  beforeEach(() => {
    db = { query: jest.fn() } as unknown as jest.Mocked<DatabaseService>;
    repository = new RecipeSearchRepository(db);
  });

  it('maps snake_case rows to RecipeSearchResult', async () => {
    db.query.mockResolvedValue([dbRow]);

    const results = await repository.search({
      chatId: '123',
      queryEmbedding: null,
      tags: null,
      limit: 20,
      offset: 0,
    });

    expect(results).toEqual([
      {
        id: 'recipe-1',
        title: 'Bolo de Cenoura',
        ingredients: ['cenoura', 'ovos'],
        instructions: ['misturar', 'assar'],
        tags: ['sobremesa'],
        sourceUrl: 'https://example.com/bolo',
        createdAt: dbRow.created_at,
        similarity: 0.87,
      },
    ]);
  });

  it('passes null embedding/tags through untouched for a plain listing', async () => {
    db.query.mockResolvedValue([]);

    await repository.search({
      chatId: '123',
      queryEmbedding: null,
      tags: null,
      limit: 20,
      offset: 40,
    });

    const [, params] = db.query.mock.calls[0];
    expect(params).toEqual(['123', null, null, 20, 40]);
  });

  it('serializes the query embedding into a pgvector literal', async () => {
    db.query.mockResolvedValue([]);
    const embedding = makeEmbedding(0.5);

    await repository.search({
      chatId: '123',
      queryEmbedding: embedding,
      tags: null,
      limit: 20,
      offset: 0,
    });

    const [, params] = db.query.mock.calls[0];
    expect(params![1]).toBe(`[${embedding.join(',')}]`);
  });

  it('passes the tags array through as-is for the GIN overlap filter', async () => {
    db.query.mockResolvedValue([]);

    await repository.search({
      chatId: '123',
      queryEmbedding: null,
      tags: ['sobremesa', 'facil'],
      limit: 20,
      offset: 0,
    });

    const [, params] = db.query.mock.calls[0];
    expect(params![2]).toEqual(['sobremesa', 'facil']);
  });

  it('uses a single parameterized query referencing recipes/tags/embedding', async () => {
    db.query.mockResolvedValue([]);

    await repository.search({
      chatId: '123',
      queryEmbedding: null,
      tags: null,
      limit: 20,
      offset: 0,
    });

    const [sql] = db.query.mock.calls[0];
    expect(sql).toContain('FROM recipes');
    expect(sql).toContain('tags && $3::varchar[]');
    expect(sql).toContain('embedding <=> $2::vector');
    expect(sql).toContain('telegram_chat_id = $1');
  });

  it('updateEmbedding issues a parameterized UPDATE with the pgvector literal', async () => {
    db.query.mockResolvedValue([]);
    const embedding = makeEmbedding(0.2);

    await repository.updateEmbedding('recipe-1', embedding);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('UPDATE recipes');
    expect(sql).toContain('SET embedding = $1::vector');
    expect(params).toEqual([`[${embedding.join(',')}]`, 'recipe-1']);
  });
});
