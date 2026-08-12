import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RecipeSearchResult } from './interfaces/recipe-search-result.interface';
import { toPgVectorLiteral } from './pgvector.util';

interface RecipeSearchRow {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  source_url: string | null;
  created_at: Date;
  similarity: number | null;
}

export interface RecipeSearchParams {
  chatId: string;
  queryEmbedding: number[] | null;
  tags: string[] | null;
  limit: number;
  offset: number;
}

/**
 * One query drives all three search modes (tag-only, vector-only, hybrid)
 * by making both the tag filter and the embedding param optional:
 *  - $2 (embedding) NULL  -> no similarity ranking, falls back to recency
 *  - $3 (tags) NULL       -> no tag filter
 * This keeps the GIN tag index (`tags &&`) and the HNSW cosine index
 * (`embedding <=>`, `vector_cosine_ops`) both usable from a single path
 * instead of maintaining three near-duplicate queries.
 */
const SEARCH_QUERY = `
  SELECT
    id,
    title,
    ingredients,
    instructions,
    tags,
    source_url,
    created_at,
    CASE WHEN $2::vector IS NOT NULL THEN 1 - (embedding <=> $2::vector) END AS similarity
  FROM recipes
  WHERE telegram_chat_id = $1
    AND ($3::varchar[] IS NULL OR tags && $3::varchar[])
    AND ($2::vector IS NULL OR embedding IS NOT NULL)
  ORDER BY
    CASE WHEN $2::vector IS NOT NULL THEN embedding <=> $2::vector END ASC NULLS LAST,
    created_at DESC
  LIMIT $4 OFFSET $5
`;

@Injectable()
export class RecipeSearchRepository {
  constructor(private readonly db: DatabaseService) {}

  async search(params: RecipeSearchParams): Promise<RecipeSearchResult[]> {
    const embeddingLiteral = params.queryEmbedding
      ? toPgVectorLiteral(params.queryEmbedding)
      : null;

    const rows = await this.db.query<RecipeSearchRow>(SEARCH_QUERY, [
      params.chatId,
      embeddingLiteral,
      params.tags,
      params.limit,
      params.offset,
    ]);

    return rows.map(mapRow);
  }

  async updateEmbedding(recipeId: string, embedding: number[]): Promise<void> {
    await this.db.query(
      `UPDATE recipes SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
      [toPgVectorLiteral(embedding), recipeId],
    );
  }
}

function mapRow(row: RecipeSearchRow): RecipeSearchResult {
  return {
    id: row.id,
    title: row.title,
    ingredients: row.ingredients,
    instructions: row.instructions,
    tags: row.tags,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    similarity: row.similarity,
  };
}
