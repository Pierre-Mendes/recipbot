import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  Queryable,
} from '../../common/database/database.service';
import { RecipeDraft } from './interfaces/draft.interface';
import { DraftState } from './enums/draft-state.enum';

interface DraftRow {
  id: string;
  telegram_chat_id: string;
  state: DraftState;
  title: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  source_url: string | null;
  raw_extracted_text: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDraftInput {
  chatId: string;
  title: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourceUrl: string | null;
  rawExtractedText: string | null;
}

export interface UpdatableDraftFields {
  title?: string;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  source_url?: string;
}

// Whitelisted, in a fixed order, so the generated SET clause never reflects
// caller-controlled column names — only values are ever parameterized input.
const UPDATABLE_COLUMNS: ReadonlyArray<keyof UpdatableDraftFields> = [
  'title',
  'ingredients',
  'instructions',
  'tags',
  'source_url',
];

@Injectable()
export class DraftsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(
    input: CreateDraftInput,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft> {
    const rows = await executor.query<DraftRow>(
      `INSERT INTO recipe_drafts
         (telegram_chat_id, title, ingredients, instructions, tags, source_url, raw_extracted_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.chatId,
        input.title,
        input.ingredients,
        input.instructions,
        input.tags,
        input.sourceUrl,
        input.rawExtractedText,
      ],
    );
    return mapRow(rows[0]);
  }

  async findById(
    id: string,
    chatId: string,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft | null> {
    const rows = await executor.query<DraftRow>(
      `SELECT * FROM recipe_drafts WHERE id = $1 AND telegram_chat_id = $2`,
      [id, chatId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async updateFields(
    id: string,
    chatId: string,
    fields: UpdatableDraftFields,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const column of UPDATABLE_COLUMNS) {
      if (fields[column] === undefined) continue;
      params.push(fields[column]);
      setClauses.push(`${column} = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return this.findById(id, chatId, executor);
    }

    params.push(id, chatId);
    const rows = await executor.query<DraftRow>(
      `UPDATE recipe_drafts
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND telegram_chat_id = $${params.length}
       RETURNING *`,
      params,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async updateState(
    id: string,
    chatId: string,
    state: DraftState,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft | null> {
    const rows = await executor.query<DraftRow>(
      `UPDATE recipe_drafts
       SET state = $1, updated_at = NOW()
       WHERE id = $2 AND telegram_chat_id = $3
       RETURNING *`,
      [state, id, chatId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(
    id: string,
    chatId: string,
    executor: Queryable = this.db,
  ): Promise<void> {
    await executor.query(
      `DELETE FROM recipe_drafts WHERE id = $1 AND telegram_chat_id = $2`,
      [id, chatId],
    );
  }
}

function mapRow(row: DraftRow): RecipeDraft {
  return {
    id: row.id,
    telegramChatId: row.telegram_chat_id,
    state: row.state,
    title: row.title,
    ingredients: row.ingredients,
    instructions: row.instructions,
    tags: row.tags,
    sourceUrl: row.source_url,
    rawExtractedText: row.raw_extracted_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
