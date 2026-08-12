import { HybridSearchService } from './hybrid-search.service';
import { EmbeddingService } from './embedding.service';
import { RecipeSearchRepository } from './recipe-search.repository';
import { QueryRecipesDto } from '../recipes/dto/query-recipes.dto';

function makeQuery(overrides: Partial<QueryRecipesDto> = {}): QueryRecipesDto {
  return {
    telegram_chat_id: '123',
    page: 1,
    limit: 20,
    ...overrides,
  } as QueryRecipesDto;
}

describe('HybridSearchService', () => {
  let embeddingService: jest.Mocked<EmbeddingService>;
  let repository: jest.Mocked<RecipeSearchRepository>;
  let service: HybridSearchService;

  beforeEach(() => {
    embeddingService = {
      embedQuery: jest.fn(),
    } as unknown as jest.Mocked<EmbeddingService>;
    repository = {
      search: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<RecipeSearchRepository>;
    service = new HybridSearchService(repository, embeddingService);
  });

  it('embeds the query text and passes the vector through when `q` is set', async () => {
    embeddingService.embedQuery.mockResolvedValue([0.1, 0.2]);

    await service.search(makeQuery({ q: 'bolo de cenoura' }));

    expect(embeddingService.embedQuery).toHaveBeenCalledWith('bolo de cenoura');
    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ queryEmbedding: [0.1, 0.2] }),
    );
  });

  it('skips embedding entirely when `q` is absent (tag-only / plain listing)', async () => {
    await service.search(makeQuery());

    expect(embeddingService.embedQuery).not.toHaveBeenCalled();
    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ queryEmbedding: null }),
    );
  });

  it('normalizes an empty tags array to null', async () => {
    await service.search(makeQuery({ tags: [] }));

    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ tags: null }),
    );
  });

  it('passes a non-empty tags array through untouched', async () => {
    await service.search(makeQuery({ tags: ['sobremesa', 'facil'] }));

    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['sobremesa', 'facil'] }),
    );
  });

  it('scopes the search to the requesting chat', async () => {
    await service.search(makeQuery({ telegram_chat_id: '999' }));

    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: '999' }),
    );
  });

  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [3, 10, 20],
  ])(
    'converts page %i / limit %i to offset %i',
    async (page, limit, offset) => {
      await service.search(makeQuery({ page, limit }));

      expect(repository.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit, offset }),
      );
    },
  );

  it('returns whatever the repository resolves', async () => {
    const results = [{ id: 'r1' }] as never;
    repository.search.mockResolvedValue(results);

    await expect(service.search(makeQuery())).resolves.toBe(results);
  });
});
