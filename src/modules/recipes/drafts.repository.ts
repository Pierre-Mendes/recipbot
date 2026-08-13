import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  Queryable,
} from '../../common/database/database.service';
import { RecipeDraft } from './interfaces/draft.interface';
import { DraftState } from './enums/draft-state.enum';
import { EditableDraftField } from './editable-draft-field';

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
  wizard_step: string | null;
  collected_fields: Record<string, unknown>;
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
  wizardStep?: string | null;
  collectedFields?: Record<string, unknown>;
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
         (telegram_chat_id, title, ingredients, instructions, tags, source_url, raw_extracted_text, wizard_step, collected_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.chatId,
        input.title,
        input.ingredients,
        input.instructions,
        input.tags,
        input.sourceUrl,
        input.rawExtractedText,
        input.wizardStep ?? null,
        JSON.stringify(input.collectedFields ?? {}),
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

  /**
   * Most recent in-progress draft for a chat (wizard_step set, not yet
   * confirmed/rejected) — used to offer "resume where you left off" after
   * the in-memory wizard session expires but the draft row survives.
   */
  async findLatestInProgress(
    chatId: string,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft | null> {
    const rows = await executor.query<DraftRow>(
      `SELECT * FROM recipe_drafts
       WHERE telegram_chat_id = $1 AND wizard_step IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [chatId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async existsForChat(
    chatId: string,
    executor: Queryable = this.db,
  ): Promise<boolean> {
    const rows = await executor.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM recipe_drafts WHERE telegram_chat_id = $1) AS exists`,
      [chatId],
    );
    return rows[0]?.exists ?? false;
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

  /**
   * Resets typed columns back to their empty default, bypassing
   * UpdateRecipeDraftDto (which forbids submitting an empty value). Used
   * by the wizard's /retroceder and /avancar to blank out fields the user
   * is jumping past or re-answering — never reachable from raw user input.
   */
  async clearFields(
    id: string,
    chatId: string,
    fields: ReadonlyArray<EditableDraftField>,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft | null> {
    if (fields.length === 0) {
      return this.findById(id, chatId, executor);
    }

    const emptyValueFor: Record<EditableDraftField, unknown> = {
      title: null,
      ingredients: [],
      instructions: [],
      tags: [],
      source_url: null,
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];
    for (const field of fields) {
      params.push(emptyValueFor[field]);
      setClauses.push(`${field} = $${params.length}`);
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

  /**
   * Persists the wizard's current position and its column-less answers
   * (observacoes/rendimento/tempo_preparo) in one write. This is the
   * durable mirror the in-memory WizardCacheService is rebuilt from after
   * a restart or a TTL expiry + resume.
   */
  async updateWizardState(
    id: string,
    chatId: string,
    wizardStep: string | null,
    collectedFields: Record<string, unknown>,
    executor: Queryable = this.db,
  ): Promise<RecipeDraft | null> {
    const rows = await executor.query<DraftRow>(
      `UPDATE recipe_drafts
       SET wizard_step = $1, collected_fields = $2, updated_at = NOW()
       WHERE id = $3 AND telegram_chat_id = $4
       RETURNING *`,
      [wizardStep, JSON.stringify(collectedFields), id, chatId],
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
    wizardStep: row.wizard_step,
    collectedFields: row.collected_fields ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
