import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  Queryable,
} from '../../common/database/database.service';
import { Recipe } from './interfaces/recipe.interface';
import { toPgVectorLiteral } from '../rag/pgvector.util';

interface RecipeRow {
  id: string;
  telegram_chat_id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  source_url: string | null;
  created_at: Date;
}

export interface CreateRecipeInput {
  chatId: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourceUrl: string | null;
  embedding: number[] | null;
}

@Injectable()
export class RecipesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(
    input: CreateRecipeInput,
    executor: Queryable = this.db,
  ): Promise<Recipe> {
    const rows = await executor.query<RecipeRow>(
      `INSERT INTO recipes
         (telegram_chat_id, title, ingredients, instructions, tags, source_url, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
       RETURNING id, telegram_chat_id, title, ingredients, instructions, tags, source_url, created_at`,
      [
        input.chatId,
        input.title,
        input.ingredients,
        input.instructions,
        input.tags,
        input.sourceUrl,
        input.embedding ? toPgVectorLiteral(input.embedding) : null,
      ],
    );
    return mapRow(rows[0]);
  }

  async existsForChat(
    chatId: string,
    executor: Queryable = this.db,
  ): Promise<boolean> {
    const rows = await executor.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM recipes WHERE telegram_chat_id = $1) AS exists`,
      [chatId],
    );
    return rows[0]?.exists ?? false;
  }
}

function mapRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    telegramChatId: row.telegram_chat_id,
    title: row.title,
    ingredients: row.ingredients,
    instructions: row.instructions,
    tags: row.tags,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
  };
}
