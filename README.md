# RecipBot

A free, intelligent recipe management assistant over Telegram. Save recipes from screenshots (OCR) or a link, review and edit the extracted draft with inline keyboards, and search your collection later by tag or natural language (hybrid keyword + vector search).

## How it works

```
Photo → Gemini Vision OCR ─┐
                            ├─→ Draft (recipe_drafts) → Telegram preview → edit / confirm / reject
Link  → SSRF-guarded fetch ┘

Confirm → Gemini embedding computed → Recipe (recipes) → draft deleted, atomically
```

- **Ingestion (US01)**: send a photo of a recipe; Gemini Vision extracts a title, ingredients, and instructions into a draft. If extraction is partial or fails to parse, the draft is still created with the raw text so nothing is lost — a human always reviews it.
- **Optional source link (US02)**: attach a URL to a draft; it's fetched through an SSRF-guarded scraper (cheerio) that only ever talks to public http(s) hosts.
- **Human-in-the-loop confirmation (US03)**: every draft is previewed in Telegram with inline keyboards to edit the title, ingredients, instructions, tags, or link before it's saved for real.
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
    bot/          Telegraf handlers, inline keyboards, webhook controller
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
| `GEMINI_VISION_MODEL` | no | defaults to `gemini-2.0-flash` |
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
