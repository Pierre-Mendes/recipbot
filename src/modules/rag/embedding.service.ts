import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { TaskType } from '@google/generative-ai';
import {
  DEFAULT_EMBEDDING_MODEL,
  MAX_EMBEDDING_INPUT_LENGTH,
} from './rag.constants';
import { EmbeddingFailedException } from './exceptions/embedding-failed.exception';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly documentEmbedder: GoogleGenerativeAIEmbeddings;
  private readonly queryEmbedder: GoogleGenerativeAIEmbeddings;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const model =
      config.get<string>('GEMINI_EMBEDDING_MODEL') ?? DEFAULT_EMBEDDING_MODEL;

    // Task type is fixed per LangChain embedder instance (constructor-only),
    // so document vs. query embedding needs two separate instances —
    // Gemini optimizes each differently for retrieval quality.
    this.documentEmbedder = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
    this.queryEmbedder = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model,
      taskType: TaskType.RETRIEVAL_QUERY,
    });
  }

  async embedDocument(text: string): Promise<number[]> {
    return this.embed(this.documentEmbedder, text);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embed(this.queryEmbedder, text);
  }

  private async embed(
    embedder: GoogleGenerativeAIEmbeddings,
    text: string,
  ): Promise<number[]> {
    const trimmed = text.trim().slice(0, MAX_EMBEDDING_INPUT_LENGTH);
    if (!trimmed) {
      throw new EmbeddingFailedException('cannot embed empty text');
    }

    try {
      return await embedder.embedQuery(trimmed);
    } catch (error) {
      this.logger.warn(`Embedding request failed: ${error}`);
      throw new EmbeddingFailedException('could not reach the embedding model');
    }
  }
}
