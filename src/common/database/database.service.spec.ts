import { DatabaseService } from './database.service';

function makeClient() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
}

describe('DatabaseService', () => {
  describe('query', () => {
    it('delegates to the pool and returns just the rows', async () => {
      const pool = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
      };
      const db = new DatabaseService(pool as never);

      const rows = await db.query('SELECT 1', ['a']);

      expect(pool.query).toHaveBeenCalledWith('SELECT 1', ['a']);
      expect(rows).toEqual([{ id: 1 }]);
    });
  });

  describe('withTransaction', () => {
    it('begins, runs work against a rows-only Queryable, commits, and releases', async () => {
      const client = makeClient();
      client.query.mockImplementation((text: string) => {
        if (text === 'SELECT inner')
          return Promise.resolve({ rows: [{ id: 'x' }] });
        return Promise.resolve({ rows: [] });
      });
      const pool = { connect: jest.fn().mockResolvedValue(client) };
      const db = new DatabaseService(pool as never);

      const result = await db.withTransaction(async (queryable) => {
        return queryable.query('SELECT inner');
      });

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenNthCalledWith(2, 'SELECT inner', []);
      expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(client.release).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'x' }]);
    });

    it('rolls back and releases the client when work throws', async () => {
      const client = makeClient();
      const pool = { connect: jest.fn().mockResolvedValue(client) };
      const db = new DatabaseService(pool as never);

      await expect(
        db.withTransaction(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.query).not.toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('ends the pool', async () => {
      const pool = { end: jest.fn().mockResolvedValue(undefined) };
      const db = new DatabaseService(pool as never);

      await db.onModuleDestroy();

      expect(pool.end).toHaveBeenCalled();
    });
  });
});
