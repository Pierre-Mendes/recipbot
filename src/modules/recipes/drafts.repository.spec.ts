import { DraftsRepository } from './drafts.repository';
import {
  DatabaseService,
  Queryable,
} from '../../common/database/database.service';
import { DraftState } from './enums/draft-state.enum';

const dbRow = {
  id: 'draft-1',
  telegram_chat_id: '123',
  state: DraftState.PENDING_CONFIRMATION,
  title: 'Bolo',
  ingredients: ['cenoura'],
  instructions: ['assar'],
  tags: [],
  source_url: null,
  raw_extracted_text: 'raw text',
  wizard_step: 'nome',
  collected_fields: {},
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

describe('DraftsRepository', () => {
  let db: jest.Mocked<DatabaseService>;
  let repository: DraftsRepository;

  beforeEach(() => {
    db = { query: jest.fn() } as unknown as jest.Mocked<DatabaseService>;
    repository = new DraftsRepository(db);
  });

  it('maps a created row to a RecipeDraft, including wizard state', async () => {
    db.query.mockResolvedValue([dbRow]);

    const draft = await repository.create({
      chatId: '123',
      title: 'Bolo',
      ingredients: ['cenoura'],
      instructions: ['assar'],
      tags: [],
      sourceUrl: null,
      rawExtractedText: 'raw text',
      wizardStep: 'nome',
      collectedFields: {},
    });

    expect(draft).toEqual({
      id: 'draft-1',
      telegramChatId: '123',
      state: DraftState.PENDING_CONFIRMATION,
      title: 'Bolo',
      ingredients: ['cenoura'],
      instructions: ['assar'],
      tags: [],
      sourceUrl: null,
      rawExtractedText: 'raw text',
      wizardStep: 'nome',
      collectedFields: {},
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    });
  });

  it('create serializes collectedFields as JSON and defaults wizardStep to null when omitted', async () => {
    db.query.mockResolvedValue([dbRow]);

    await repository.create({
      chatId: '123',
      title: null,
      ingredients: [],
      instructions: [],
      tags: [],
      sourceUrl: null,
      rawExtractedText: null,
    });

    const [, params] = db.query.mock.calls[0];
    expect(params![7]).toBeNull();
    expect(params![8]).toBe('{}');
  });

  it('scopes findById to both id and chatId', async () => {
    db.query.mockResolvedValue([dbRow]);

    await repository.findById('draft-1', '123');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE id = $1 AND telegram_chat_id = $2');
    expect(params).toEqual(['draft-1', '123']);
  });

  it('returns null when findById finds nothing', async () => {
    db.query.mockResolvedValue([]);
    expect(await repository.findById('missing', '123')).toBeNull();
  });

  describe('findLatestInProgress', () => {
    it('scopes to the chat and requires a non-null wizard_step, most recent first', async () => {
      db.query.mockResolvedValue([dbRow]);

      const result = await repository.findLatestInProgress('123');

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('wizard_step IS NOT NULL');
      expect(sql).toContain('ORDER BY updated_at DESC');
      expect(params).toEqual(['123']);
      expect(result?.wizardStep).toBe('nome');
    });

    it('returns null when nothing is in progress', async () => {
      db.query.mockResolvedValue([]);
      expect(await repository.findLatestInProgress('123')).toBeNull();
    });
  });

  describe('existsForChat', () => {
    it('returns true when the query reports a match', async () => {
      db.query.mockResolvedValue([{ exists: true }]);
      expect(await repository.existsForChat('123')).toBe(true);
    });

    it('returns false when there is no row at all', async () => {
      db.query.mockResolvedValue([]);
      expect(await repository.existsForChat('123')).toBe(false);
    });
  });

  it('updateFields only includes whitelisted columns that were actually provided', async () => {
    db.query.mockResolvedValue([dbRow]);

    await repository.updateFields('draft-1', '123', { title: 'New Title' });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('SET title = $1, updated_at = NOW()');
    expect(sql).not.toContain('ingredients');
    expect(params).toEqual(['New Title', 'draft-1', '123']);
  });

  it('updateFields scopes the UPDATE to id and chatId', async () => {
    db.query.mockResolvedValue([dbRow]);

    await repository.updateFields('draft-1', '123', { tags: ['a', 'b'] });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE id = $2 AND telegram_chat_id = $3');
    expect(params).toEqual([['a', 'b'], 'draft-1', '123']);
  });

  it('updateFields with no provided fields falls back to findById', async () => {
    db.query.mockResolvedValue([dbRow]);

    await repository.updateFields('draft-1', '123', {});

    const [sql] = db.query.mock.calls[0];
    expect(sql).toContain('SELECT * FROM recipe_drafts');
  });

  describe('clearFields', () => {
    it('resets each field to its empty default, bypassing DTO validation', async () => {
      db.query.mockResolvedValue([dbRow]);

      await repository.clearFields('draft-1', '123', [
        'title',
        'ingredients',
        'source_url',
      ]);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain(
        'SET title = $1, ingredients = $2, source_url = $3',
      );
      expect(params).toEqual([null, [], null, 'draft-1', '123']);
    });

    it('with an empty field list falls back to findById instead of issuing an empty UPDATE', async () => {
      db.query.mockResolvedValue([dbRow]);

      await repository.clearFields('draft-1', '123', []);

      const [sql] = db.query.mock.calls[0];
      expect(sql).toContain('SELECT * FROM recipe_drafts');
    });
  });

  describe('updateWizardState', () => {
    it('persists wizard_step and collected_fields as JSON', async () => {
      db.query.mockResolvedValue([
        {
          ...dbRow,
          wizard_step: 'tags',
          collected_fields: { rendimento: '4 porções' },
        },
      ]);

      const result = await repository.updateWizardState(
        'draft-1',
        '123',
        'tags',
        {
          rendimento: '4 porções',
        },
      );

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('SET wizard_step = $1, collected_fields = $2');
      expect(params).toEqual([
        'tags',
        JSON.stringify({ rendimento: '4 porções' }),
        'draft-1',
        '123',
      ]);
      expect(result?.wizardStep).toBe('tags');
      expect(result?.collectedFields).toEqual({ rendimento: '4 porções' });
    });

    it('accepts wizard_step = null (used when advancing to CONFIRMACAO in some flows)', async () => {
      db.query.mockResolvedValue([{ ...dbRow, wizard_step: null }]);

      await repository.updateWizardState('draft-1', '123', null, {});

      const [, params] = db.query.mock.calls[0];
      expect(params![0]).toBeNull();
    });
  });

  it('updateState sets state and scopes by id/chatId', async () => {
    db.query.mockResolvedValue([{ ...dbRow, state: DraftState.CONFIRMED }]);

    const result = await repository.updateState(
      'draft-1',
      '123',
      DraftState.CONFIRMED,
    );

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('SET state = $1');
    expect(params).toEqual([DraftState.CONFIRMED, 'draft-1', '123']);
    expect(result?.state).toBe(DraftState.CONFIRMED);
  });

  it('delete scopes the DELETE to id and chatId', async () => {
    db.query.mockResolvedValue([]);

    await repository.delete('draft-1', '123');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain(
      'DELETE FROM recipe_drafts WHERE id = $1 AND telegram_chat_id = $2',
    );
    expect(params).toEqual(['draft-1', '123']);
  });

  it('accepts a transactional Queryable in place of the default DatabaseService', async () => {
    const txQueryable: jest.Mocked<Queryable> = {
      query: jest.fn().mockResolvedValue([dbRow]),
    };

    await repository.create(
      {
        chatId: '123',
        title: 'Bolo',
        ingredients: [],
        instructions: [],
        tags: [],
        sourceUrl: null,
        rawExtractedText: null,
      },
      txQueryable,
    );

    expect(txQueryable.query).toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });
});
