import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/common/database/database.module';
import { DatabaseService } from '../../src/common/database/database.service';
import { RagModule } from '../../src/modules/rag/rag.module';
import { EmbeddingService } from '../../src/modules/rag/embedding.service';
import { HybridSearchService } from '../../src/modules/rag/hybrid-search.service';
import { toPgVectorLiteral } from '../../src/modules/rag/pgvector.util';
import { EMBEDDING_DIMENSIONS } from '../../src/modules/rag/rag.constants';
import { QueryRecipesDto } from '../../src/modules/recipes/dto/query-recipes.dto';

/**
 * Exercises the real GIN tag index and pgvector HNSW cosine index against
 * the dockerized Postgres (`docker compose up -d postgres`). Only the
 * Gemini call is faked — everything from HybridSearchService down through
 * raw SQL is real, which is the part unit tests (fully mocked DB) can't
 * verify: that the query text actually produces the intended ordering
 * and that chat scoping/pagination hold under real index-backed queries.
 */

process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/recipbot?schema=public';
process.env.NODE_ENV ??= 'test';

const CHAT_ID = 'integration-test-chat';
const OTHER_CHAT_ID = 'integration-test-chat-other';

function sparseVector(weights: Record<number, number>): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  for (const [index, value] of Object.entries(weights)) {
    vector[Number(index)] = value;
  }
  return vector;
}

// Orthogonal-ish reference vectors so cosine similarity ordering is
// predictable: VEC_A and VEC_A_NEAR are close (~0.8), VEC_B is
// unrelated (~0).
const VEC_A = sparseVector({ 0: 1 });
const VEC_A_NEAR = sparseVector({ 0: 0.8, 1: 0.6 });
const VEC_B = sparseVector({ 1: 1 });

describe('RAG hybrid search (integration)', () => {
  let moduleRef: TestingModule;
  let db: DatabaseService;
  let hybridSearch: HybridSearchService;
  let embeddingService: { embedQuery: jest.Mock };
  const insertedIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        RagModule,
      ],
    })
      .overrideProvider(EmbeddingService)
      .useValue({ embedQuery: jest.fn(), embedDocument: jest.fn() })
      .compile();

    db = moduleRef.get(DatabaseService);
    hybridSearch = moduleRef.get(HybridSearchService);
    embeddingService = moduleRef.get(EmbeddingService) as unknown as {
      embedQuery: jest.Mock;
    };

    await seed();
  });

  afterAll(async () => {
    if (db && insertedIds.length > 0) {
      await db.query('DELETE FROM recipes WHERE id = ANY($1::uuid[])', [
        insertedIds,
      ]);
    }
    await moduleRef?.close();
  });

  async function insertRecipe(params: {
    chatId: string;
    title: string;
    tags: string[];
    embedding?: number[];
  }): Promise<string> {
    const rows = await db.query<{ id: string }>(
      `INSERT INTO recipes (telegram_chat_id, title, ingredients, instructions, tags, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        params.chatId,
        params.title,
        ['ingredient'],
        ['step'],
        params.tags,
        params.embedding ? toPgVectorLiteral(params.embedding) : null,
      ],
    );
    insertedIds.push(rows[0].id);
    return rows[0].id;
  }

  let recipeA: string;
  let recipeANear: string;
  let recipeB: string;
  let recipeNoEmbedding: string;
  let recipeOtherChat: string;

  async function seed() {
    recipeA = await insertRecipe({
      chatId: CHAT_ID,
      title: 'Bolo de Cenoura',
      tags: ['sobremesa', 'bolo'],
      embedding: VEC_A,
    });
    recipeANear = await insertRecipe({
      chatId: CHAT_ID,
      title: 'Bolo de Chocolate',
      tags: ['sobremesa', 'bolo', 'chocolate'],
      embedding: VEC_A_NEAR,
    });
    recipeB = await insertRecipe({
      chatId: CHAT_ID,
      title: 'Salada Verde',
      tags: ['salada', 'saudavel'],
      embedding: VEC_B,
    });
    recipeNoEmbedding = await insertRecipe({
      chatId: CHAT_ID,
      title: 'Rascunho Sem Embedding',
      tags: ['sobremesa'],
    });
    recipeOtherChat = await insertRecipe({
      chatId: OTHER_CHAT_ID,
      title: 'Bolo de Outro Chat',
      tags: ['sobremesa', 'bolo'],
      embedding: VEC_A,
    });
  }

  function query(overrides: Partial<QueryRecipesDto> = {}): QueryRecipesDto {
    return {
      telegram_chat_id: CHAT_ID,
      page: 1,
      limit: 20,
      ...overrides,
    } as QueryRecipesDto;
  }

  it('tag search uses the GIN overlap index and excludes non-matching recipes', async () => {
    const results = await hybridSearch.search(query({ tags: ['sobremesa'] }));
    const ids = results.map((r) => r.id);

    expect(ids).toEqual(
      expect.arrayContaining([recipeA, recipeANear, recipeNoEmbedding]),
    );
    expect(ids).not.toContain(recipeB);
    expect(ids).not.toContain(recipeOtherChat);
    expect(embeddingService.embedQuery).not.toHaveBeenCalled();
  });

  it('vector search orders by real pgvector cosine similarity and excludes rows with no embedding', async () => {
    embeddingService.embedQuery.mockResolvedValueOnce(VEC_A);

    const results = await hybridSearch.search(
      query({ q: 'algo parecido com A' }),
    );
    const ids = results.map((r) => r.id);

    expect(ids).not.toContain(recipeNoEmbedding);
    expect(ids).not.toContain(recipeOtherChat);

    const posA = ids.indexOf(recipeA);
    const posANear = ids.indexOf(recipeANear);
    const posB = ids.indexOf(recipeB);
    expect(posA).toBeGreaterThanOrEqual(0);
    expect(posANear).toBeGreaterThan(posA);
    expect(posB).toBeGreaterThan(posANear);

    const found = results.find((r) => r.id === recipeA)!;
    expect(found.similarity).not.toBeNull();
    expect(found.similarity!).toBeCloseTo(1, 5);
  });

  it('hybrid search filters by tag and ranks the remaining candidates by similarity', async () => {
    embeddingService.embedQuery.mockResolvedValueOnce(VEC_A);

    const results = await hybridSearch.search(
      query({ tags: ['salada'], q: 'algo parecido com A' }),
    );

    expect(results.map((r) => r.id)).toEqual([recipeB]);
  });

  it('never returns recipes belonging to another chat', async () => {
    const results = await hybridSearch.search(
      query({ tags: ['sobremesa', 'bolo'] }),
    );
    expect(results.map((r) => r.id)).not.toContain(recipeOtherChat);
  });

  it('paginates consistently across pages', async () => {
    const page1 = await hybridSearch.search(
      query({ tags: ['sobremesa'], limit: 1, page: 1 }),
    );
    const page2 = await hybridSearch.search(
      query({ tags: ['sobremesa'], limit: 1, page: 2 }),
    );

    expect(page1).toHaveLength(1);
    expect(page2).toHaveLength(1);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('plain listing (no tags, no q) returns only the requesting chat’s recipes', async () => {
    const results = await hybridSearch.search(query({ limit: 50 }));
    const ids = results.map((r) => r.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        recipeA,
        recipeANear,
        recipeB,
        recipeNoEmbedding,
      ]),
    );
    expect(ids).not.toContain(recipeOtherChat);
  });
});
