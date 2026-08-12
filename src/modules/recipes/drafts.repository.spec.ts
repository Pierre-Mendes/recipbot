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

  it('maps a created row to a RecipeDraft', async () => {
    db.query.mockResolvedValue([dbRow]);

    const draft = await repository.create({
      chatId: '123',
      title: 'Bolo',
      ingredients: ['cenoura'],
      instructions: ['assar'],
      tags: [],
      sourceUrl: null,
      rawExtractedText: 'raw text',
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
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    });
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
