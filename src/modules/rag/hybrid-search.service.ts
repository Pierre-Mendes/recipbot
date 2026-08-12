import { Injectable } from '@nestjs/common';
import { QueryRecipesDto } from '../recipes/dto/query-recipes.dto';
import { EmbeddingService } from './embedding.service';
import { RecipeSearchRepository } from './recipe-search.repository';
import { RecipeSearchResult } from './interfaces/recipe-search-result.interface';

/**
 * US04: hybrid recipe search. Mode is decided by which fields are set on
 * the (already chat_id-scoped, sanitized) query DTO:
 *  - `q` only        -> pgvector cosine similarity ranking
 *  - `tags` only      -> GIN tag-overlap filter, most recent first
 *  - both             -> tag filter narrows the candidates, similarity ranks them
 *  - neither          -> plain recency-ordered listing for the chat
 */
@Injectable()
export class HybridSearchService {
  constructor(
    private readonly repository: RecipeSearchRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(query: QueryRecipesDto): Promise<RecipeSearchResult[]> {
    const queryEmbedding = query.q
      ? await this.embeddingService.embedQuery(query.q)
      : null;
    const tags = query.tags && query.tags.length > 0 ? query.tags : null;
    const offset = (query.page - 1) * query.limit;

    return this.repository.search({
      chatId: query.telegram_chat_id,
      queryEmbedding,
      tags,
      limit: query.limit,
      offset,
    });
  }
}
