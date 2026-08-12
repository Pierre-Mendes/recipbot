import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_VISION_MODEL } from './ocr.constants';
import { validateImage } from './image-validation.util';
import { OcrExtractionFailedException } from './exceptions/ocr-extraction-failed.exception';
import { OcrExtractionResult } from './interfaces/ocr-extraction-result.interface';

const EXTRACTION_PROMPT = `You are extracting a cooking recipe from a photo (e.g. a screenshot of a recipe website, social media post, or handwritten note).
Return ONLY a JSON object with this exact shape, no markdown fences, no commentary:
{
  "title": string | null,
  "ingredients": string[],
  "instructions": string[]
}
Rules:
- "ingredients" is one entry per ingredient line, as written.
- "instructions" is one entry per step, in order.
- If the image is not a recipe or a field cannot be determined, use null for "title" and [] for the arrays.
- Do not invent information that is not visible in the image.`;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName =
      this.config.get<string>('GEMINI_VISION_MODEL') ?? DEFAULT_VISION_MODEL;
  }

  async extractRecipeFromImage(
    imageBuffer: Buffer,
    declaredMimeType: string,
  ): Promise<OcrExtractionResult> {
    const mimeType = validateImage(imageBuffer, declaredMimeType);

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    let responseText: string;
    try {
      const result = await model.generateContent([
        { text: EXTRACTION_PROMPT },
        { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
      ]);
      responseText = result.response.text();
    } catch (error) {
      this.logger.warn(`Gemini Vision request failed: ${error}`);
      throw new OcrExtractionFailedException(
        'could not reach the vision model',
      );
    }

    return parseExtractionResponse(responseText);
  }
}

/**
 * Best-effort parse: a malformed or unexpected response never throws —
 * it degrades to an empty draft with the raw text preserved, so the user
 * can still fill in the recipe by hand (human-in-the-loop, US03). Only
 * unreachable-model errors above are treated as hard failures.
 */
function parseExtractionResponse(responseText: string): OcrExtractionResult {
  const fallback: OcrExtractionResult = {
    title: null,
    ingredients: [],
    instructions: [],
    rawExtractedText: responseText,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return fallback;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return fallback;
  }

  const candidate = parsed as Record<string, unknown>;

  return {
    title: typeof candidate.title === 'string' ? candidate.title : null,
    ingredients: toStringArray(candidate.ingredients),
    instructions: toStringArray(candidate.instructions),
    rawExtractedText: responseText,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}
