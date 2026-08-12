import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { EmbeddingFailedException } from './exceptions/embedding-failed.exception';
import { MAX_EMBEDDING_INPUT_LENGTH } from './rag.constants';

const documentEmbedQuery = jest.fn();
const queryEmbedQuery = jest.fn();

jest.mock('@langchain/google-genai', () => ({
  GoogleGenerativeAIEmbeddings: jest
    .fn()
    .mockImplementation((config: { taskType: string }) => ({
      taskType: config.taskType,
      embedQuery:
        config.taskType === 'RETRIEVAL_DOCUMENT'
          ? documentEmbedQuery
          : queryEmbedQuery,
    })),
}));

function configWithKey(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    GEMINI_API_KEY: 'test-key',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('EmbeddingService', () => {
  beforeEach(() => {
    documentEmbedQuery.mockReset();
    queryEmbedQuery.mockReset();
  });

  it('throws at construction time when GEMINI_API_KEY is missing', () => {
    expect(
      () => new EmbeddingService(configWithKey({ GEMINI_API_KEY: undefined })),
    ).toThrow('GEMINI_API_KEY is not configured');
  });

  it('routes embedDocument through the RETRIEVAL_DOCUMENT embedder', async () => {
    documentEmbedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
    const service = new EmbeddingService(configWithKey());

    const result = await service.embedDocument('Bolo de cenoura');

    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(documentEmbedQuery).toHaveBeenCalledWith('Bolo de cenoura');
    expect(queryEmbedQuery).not.toHaveBeenCalled();
  });

  it('routes embedQuery through the RETRIEVAL_QUERY embedder', async () => {
    queryEmbedQuery.mockResolvedValue([0.4, 0.5, 0.6]);
    const service = new EmbeddingService(configWithKey());

    const result = await service.embedQuery('receita de bolo');

    expect(result).toEqual([0.4, 0.5, 0.6]);
    expect(queryEmbedQuery).toHaveBeenCalledWith('receita de bolo');
    expect(documentEmbedQuery).not.toHaveBeenCalled();
  });

  it('trims and truncates text before embedding', async () => {
    queryEmbedQuery.mockResolvedValue([0]);
    const service = new EmbeddingService(configWithKey());
    const longText = `  ${'a'.repeat(MAX_EMBEDDING_INPUT_LENGTH + 500)}  `;

    await service.embedQuery(longText);

    const [sentText] = queryEmbedQuery.mock.calls[0];
    expect(sentText.length).toBe(MAX_EMBEDDING_INPUT_LENGTH);
    expect(sentText.startsWith(' ')).toBe(false);
  });

  it('rejects empty or whitespace-only text without calling the embedder', async () => {
    const service = new EmbeddingService(configWithKey());

    await expect(service.embedQuery('   ')).rejects.toThrow(
      EmbeddingFailedException,
    );
    expect(queryEmbedQuery).not.toHaveBeenCalled();
  });

  it('wraps embedder failures in EmbeddingFailedException', async () => {
    queryEmbedQuery.mockRejectedValue(new Error('quota exceeded'));
    const service = new EmbeddingService(configWithKey());

    await expect(service.embedQuery('bolo')).rejects.toThrow(
      EmbeddingFailedException,
    );
  });
});
