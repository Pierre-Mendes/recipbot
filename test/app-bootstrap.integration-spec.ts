import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/common/database/database.service';

/**
 * Compiles the entire DI graph (every module wired in AppModule) against
 * the real dockerized Postgres and runs lifecycle hooks (init()), the way
 * `docker compose up` would — catches wiring mistakes (missing providers,
 * circular deps, a module forgetting to import what it needs) that
 * per-module unit/integration tests can't see because they only ever
 * build a slice of the graph.
 *
 * TELEGRAM_BOT_MODE is left at its default ("webhook"), so BotService's
 * onModuleInit does not attempt any real network call — this only proves
 * the app *boots*, not that Telegram/Gemini integration works end to end.
 */

process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/recipbot?schema=public';
process.env.TELEGRAM_BOT_TOKEN ??= 'test-telegram-token';
process.env.GEMINI_API_KEY ??= 'test-gemini-key';
process.env.TELEGRAM_WEBHOOK_SECRET ??= 'test-webhook-secret';
process.env.NODE_ENV ??= 'test';

describe('AppModule bootstrap (integration)', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('compiles the full DI graph, runs init hooks, and can talk to the database', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleRef.init();

    const db = moduleRef.get(DatabaseService);
    const rows = await db.query<{ ok: number }>('SELECT 1 as ok');
    expect(rows[0].ok).toBe(1);
  });
});
