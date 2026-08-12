import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';
import { PG_POOL } from './database.constants';

/**
 * Minimal shape repositories depend on, instead of `DatabaseService`
 * directly — lets `withTransaction`'s callback hand out something with
 * the same rows-only contract as a plain query, so repository methods
 * can accept either transparently.
 */
export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<T[]>;
}

@Injectable()
export class DatabaseService implements Queryable, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Runs a parameterized query. Callers must never interpolate user input
   * into `text` — always pass values through `params` so pg can bind them
   * server-side (OWASP A03: Injection).
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(text, params as unknown[]);
    return result.rows;
  }

  async withTransaction<T>(
    work: (queryable: Queryable) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    const queryable: Queryable = {
      query: async <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params: ReadonlyArray<unknown> = [],
      ) => {
        const result = await client.query<R>(text, params as unknown[]);
        return result.rows;
      },
    };

    try {
      await client.query('BEGIN');
      const result = await work(queryable);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('PostgreSQL pool closed');
  }
}
