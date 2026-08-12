import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL is not configured');
        }

        const isProduction = config.get<string>('NODE_ENV') === 'production';

        const pool = new Pool({
          connectionString,
          ssl: isProduction ? { rejectUnauthorized: true } : undefined,
          max: config.get<number>('DATABASE_POOL_MAX') ?? 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
          statement_timeout: 10_000,
          query_timeout: 10_000,
        });

        // Prevents an unhandled idle-client error from crashing the process.
        pool.on('error', (err) => {
          console.error('Unexpected PostgreSQL pool error', err);
        });

        return pool;
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService, PG_POOL],
})
export class DatabaseModule {}
