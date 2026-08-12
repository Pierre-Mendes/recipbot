import { ConfigService } from '@nestjs/config';
import { OcrService } from './ocr.service';
import { InvalidImageException } from './exceptions/invalid-image.exception';
import { OcrExtractionFailedException } from './exceptions/ocr-extraction-failed.exception';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

function configWithKey(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string | undefined> = {
    GEMINI_API_KEY: 'test-key',
  };
  const values = { ...defaults, ...overrides };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function respondWith(text: string) {
  mockGenerateContent.mockResolvedValue({
    response: { text: () => text },
  });
}

describe('OcrService', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
  });

  it('throws at construction time when GEMINI_API_KEY is missing', () => {
    expect(
      () => new OcrService(configWithKey({ GEMINI_API_KEY: undefined })),
    ).toThrow('GEMINI_API_KEY is not configured');
  });

  it('rejects an invalid image before ever calling the model', async () => {
    const service = new OcrService(configWithKey());

    await expect(
      service.extractRecipeFromImage(Buffer.alloc(0), 'image/png'),
    ).rejects.toThrow(InvalidImageException);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('parses a well-formed JSON extraction result', async () => {
    respondWith(
      JSON.stringify({
        title: 'Bolo de Cenoura',
        ingredients: ['2 cenouras', '3 ovos'],
        instructions: ['Bata tudo', 'Asse por 40 min'],
      }),
    );
    const service = new OcrService(configWithKey());

    const result = await service.extractRecipeFromImage(
      PNG_HEADER,
      'image/png',
    );

    expect(result).toEqual({
      title: 'Bolo de Cenoura',
      ingredients: ['2 cenouras', '3 ovos'],
      instructions: ['Bata tudo', 'Asse por 40 min'],
      rawExtractedText: expect.stringContaining('Bolo de Cenoura'),
    });
  });

  it('degrades to an empty draft when the response is not valid JSON', async () => {
    respondWith('sorry, I cannot read this image clearly');
    const service = new OcrService(configWithKey());

    const result = await service.extractRecipeFromImage(
      PNG_HEADER,
      'image/png',
    );

    expect(result).toEqual({
      title: null,
      ingredients: [],
      instructions: [],
      rawExtractedText: 'sorry, I cannot read this image clearly',
    });
  });

  it('degrades to an empty draft when the response is valid JSON but not an object', async () => {
    respondWith(JSON.stringify(['not', 'an', 'object']));
    const service = new OcrService(configWithKey());

    const result = await service.extractRecipeFromImage(
      PNG_HEADER,
      'image/png',
    );

    expect(result.title).toBeNull();
    expect(result.ingredients).toEqual([]);
    expect(result.instructions).toEqual([]);
  });

  it('sanitizes malformed fields instead of throwing', async () => {
    respondWith(
      JSON.stringify({
        title: 42,
        ingredients: ['flour', 7, null, 'sugar'],
        instructions: 'not-an-array',
      }),
    );
    const service = new OcrService(configWithKey());

    const result = await service.extractRecipeFromImage(
      PNG_HEADER,
      'image/png',
    );

    expect(result.title).toBeNull();
    expect(result.ingredients).toEqual(['flour', 'sugar']);
    expect(result.instructions).toEqual([]);
  });

  it('degrades to an empty draft when the response is the JSON literal null', async () => {
    respondWith('null');
    const service = new OcrService(configWithKey());

    const result = await service.extractRecipeFromImage(
      PNG_HEADER,
      'image/png',
    );

    expect(result.title).toBeNull();
    expect(result.ingredients).toEqual([]);
    expect(result.instructions).toEqual([]);
  });

  it('throws OcrExtractionFailedException when the model call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('quota exceeded'));
    const service = new OcrService(configWithKey());

    await expect(
      service.extractRecipeFromImage(PNG_HEADER, 'image/png'),
    ).rejects.toThrow(OcrExtractionFailedException);
  });
});
