# RecipBot

A free, intelligent recipe management assistant over Telegram. Save recipes by text, screenshot (OCR), or link through a step-by-step wizard, then search your collection later by tag or natural language (hybrid keyword + vector search). **The bot only ever replies in pt-BR**, regardless of the code/comment language.

## How it works

```
/nova → 📝 Texto | 📷 Imagem/Print | 🔗 Link do site
                                        │
                          (Imagem/Link: Gemini Vision OCR or an
                           SSRF-guarded scraper pre-fills a part;
                           user confirms or edits it)
                                        │
                                        ▼
      Wizard: nome → ingredientes → modo de preparo → observações →
      rendimento → tempo de preparo → link → tags  (recipe_drafts:
      wizard_step + collected_fields — all steps skippable via "Pular",
      /retroceder and /avancar jump between them, /cancelar abandons)
                                        │
                                        ▼
                 Confirmação (soft warning, never a hard block, if
                 nome/ingredientes/modo de preparo are still empty)
                                        │
                                        ▼
        Salvar → Gemini embedding computed → Recipe (recipes) →
                  draft deleted, atomically
```

- **Ingestion (US01/US06)**: start with `/nova` and pick Texto, Imagem, or Link. A photo runs Gemini Vision OCR; a link runs an SSRF-guarded scrape (cheerio, public http(s) hosts only). Either pre-fills part of the wizard, shown for confirm/edit before continuing.
- **Human-in-the-loop wizard (US03/US05–US08)**: conditional onboarding on `/start` (full welcome for a first-time chat, a short greeting otherwise), then a step-by-step collection flow. `nome`/`ingredientes`/`modo de preparo` are the core fields but never hard-block progress — every step, core or optional, has a "Pular" button. `/retroceder` and `/avancar` list steps to jump between (jumping re-asks everything from that point on); `/cancelar` abandons the draft. At final confirmation, empty core fields trigger a soft warning (`💾 Salvar assim mesmo` / `✏️ Completar agora`) instead of a block. In-progress wizard state lives in a 30-minute in-memory TTL cache (warnings at 20/15/10 minutes left) mirroring `recipe_drafts.wizard_step`/`collected_fields`; on expiry the draft itself is untouched and resuming is offered on the next interaction.
- **Optional source link (US02)**: the link step accepts a Reels/video/site URL, SSRF-validated the same way as the Link ingestion path.
- **Hybrid search (US04)**: search by tag (Postgres GIN index), natural language (pgvector cosine similarity over Gemini embeddings), or both at once.

## Tech stack

- **Runtime**: Node.js 20, NestJS, TypeScript
- **Bot**: [Telegraf](https://telegraf.js.org/) (webhook-first, with long-polling for local dev)
- **AI**: Google Gemini — Vision for OCR, `text-embedding-004` for embeddings — via `@google/generative-ai` and LangChain's `@langchain/google-genai`
- **Database**: PostgreSQL + [pgvector](https://github.com/pgvector/pgvector), accessed with raw parameterized SQL (`pg`), no ORM
- **Scraping**: cheerio, behind a DNS-resolution-time SSRF guard
- **Validation**: `class-validator` / `class-transformer` DTOs
- **Testing**: Jest (unit + integration), against a real Dockerized Postgres for integration tests

## Project layout

```
src/
  common/
    database/     pooled pg client, parameterized query + transaction helpers
    security/     SSRF IP-range checks, constant-time secret comparison
    validators/   OWASP-focused sanitization (control-char stripping, SSRF-aware URL validator)
  modules/
    ocr/          Gemini Vision extraction, image validation (magic-byte sniffing)
    scraping/     cheerio + runtime SSRF guard for optional source links
    rag/          Gemini embeddings + hybrid (tag/vector) search
    recipes/      DTOs, drafts/recipes repositories, the use-case layer (RecipesService)
    bot/          Telegraf handlers, webhook controller, and bot/wizard/ (the
                  step-by-step state machine: steps, TTL cache, pt-BR presenter)
docs/              product docs the codebase was built from (user stories, schema, business rules)
test/              integration tests that run against a real Postgres container
```

Roughly: `bot` (Handlers) → `recipes` (Use Cases → Repositories) → `ocr`/`scraping`/`rag` (supporting services) → Postgres.

## Getting started

### Prerequisites

- Docker & Docker Compose
- A [Telegram bot token](https://core.telegram.org/bots#how-do-i-create-a-bot) (from [@BotFather](https://t.me/BotFather))
- A [Gemini API key](https://ai.google.dev/) (free tier is enough)

### Run with Docker Compose

```bash
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, GEMINI_API_KEY

docker compose up --build
```

This builds the app image, starts Postgres with the `pgvector` extension and schema already applied (`docs/database-schema.sql` runs automatically on first boot), and starts the bot. The app waits for Postgres's healthcheck before starting.

### Bot connectivity: webhook vs. polling

- **`TELEGRAM_BOT_MODE=webhook`** (default) — the app exposes `POST /telegram/webhook`, guarded by a constant-time comparison against `TELEGRAM_WEBHOOK_SECRET` (sent by Telegram as the `X-Telegram-Bot-Api-Secret-Token` header). You'll need a public HTTPS URL registered with Telegram (`setWebhook`) pointing at this route.
- **`TELEGRAM_BOT_MODE=polling`** — for local development without a public URL; the bot long-polls Telegram directly.

### Local development without Docker

```bash
npm install
npm run start:dev   # requires DATABASE_URL pointing at a running Postgres+pgvector instance
```

## Environment variables

See [`.env.example`](.env.example) for the full list with defaults. The essentials:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `TELEGRAM_BOT_TOKEN` | yes | from @BotFather |
| `TELEGRAM_BOT_MODE` | no | `webhook` (default) or `polling` |
| `TELEGRAM_WEBHOOK_SECRET` | yes, in webhook mode | validated on every webhook request |
| `GEMINI_API_KEY` | yes | used for both Vision (OCR) and embeddings |
| `GEMINI_VISION_MODEL` | no | defaults to `gemini-3.6-flash` |
| `GEMINI_EMBEDDING_MODEL` | no | defaults to `text-embedding-004` (768 dims — must match `docs/database-schema.sql`'s `VECTOR(768)` column if changed) |

## Testing

```bash
npm test              # unit tests, fully mocked (no external services)
npm run test:cov       # unit tests with coverage (enforced threshold: 80%)
npm run test:integration   # integration tests — requires a running Postgres (docker compose up -d postgres)
```

Integration tests exercise real SQL against a live Postgres+pgvector instance — the GIN tag index, pgvector cosine similarity ordering, and the transactional draft-confirmation flow — while mocking only the external Gemini API calls.

## Security notes

- **SSRF protection** on every user-supplied URL: a DTO-time literal check (`IsPublicHttpUrl`) plus a DNS-resolution-time guard in the scraping module that re-validates on every redirect hop, closing the DNS-rebinding gap a literal check alone can't catch.
- **Input sanitization**: all recipe text is control-character-stripped and length-capped via `class-validator` DTOs before it reaches the database or an LLM prompt.
- **Chat scoping**: every draft/recipe read or write is scoped to the requesting Telegram chat at the SQL level — a recipe from one chat can never be read, edited, or listed by another.
- **Webhook authentication**: the Telegram webhook endpoint validates the secret token with a constant-time comparison to avoid timing side-channels.
- **Parameterized SQL** throughout; no string-built queries.

## License

MIT
