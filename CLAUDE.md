# 📱 RecipBot MVP - Visão Geral do Projeto

## 🎯 Missão

RecipBot é uma aplicação web para **gerenciar receitas pessoais** com foco em:
- ✅ Adicionar receitas (manual, por link, scraper)
- ✅ Organizar por tags
- ✅ Buscar receitas rapidamente
- 🚀 Futuro: Análise nutricional, cardápios semanais

---

## 📊 Especificações do MVP

| Item | Descrição |
|------|-----------|
| **Custo** | $0 (zero APIs pagas) |
| **Tempo** | 6 semanas (225 horas) |
| **Features** | Manual + Link + Scraper + Tags + Search |
| **Escala** | 1 usuário → 1000 usuários |
| **Tech Stack** | Laravel 11 + Vue 3 + PostgreSQL + Redis |

---

## 🏗️ Arquitetura

### Backend (Laravel 11)
```
app/
├── Models/              # Eloquent models (User, Recipe, Tag)
├── Http/
│   ├── Controllers/     # API endpoints
│   ├── Requests/        # Form validation
│   └── Resources/       # API responses
├── Services/            # Business logic
│   ├── RecipeService
│   ├── ScraperService
│   └── SearchService
├── Repositories/        # Data access layer
├── Events/              # Domain events
├── Listeners/           # Event handlers
├── Jobs/                # Queue jobs
└── Enums/               # Type-safe enums
```

### Frontend (Vue 3 + TypeScript)
```
src/
├── components/          # Reusable UI components
│   ├── RecipeForm.vue
│   ├── RecipeCard.vue
│   └── SearchBar.vue
├── pages/               # Page components
│   ├── RecipesPage.vue
│   ├── SearchPage.vue
│   └── DetailPage.vue
├── stores/              # Pinia state management
├── composables/         # Reusable logic hooks
├── types/               # TypeScript interfaces
└── utils/               # Helper functions
```

### Database (PostgreSQL)
```sql
-- Tabelas principais
users (id, email, password, created_at)
recipes (id, user_id, title, ingredients, tags, source_url, created_at, deleted_at)
recipe_drafts (id, user_id, original_url, extracted_data, status, created_at)
```

---

## 🔑 Comandos Essenciais

### Setup
```bash
cd recipbot
chmod +x setup.sh
./setup.sh
cp .env.example .env
docker-compose up --build
```

### Desenvolvimento Backend
```bash
# Entrar no container
docker-compose exec app bash

# Migrations
php artisan migrate
php artisan migrate:fresh --seed

# Testes
php artisan test
php artisan test --filter RecipeTest

# Code quality
phpstan analyse app/

# Async jobs (terminal separado)
php artisan queue:listen
```

### Desenvolvimento Frontend
```bash
# Terminal separado, ainda no docker
cd frontend
npm install
npm run dev

# Testes
npm run test
npm run test:ui

# Build
npm run build
```

### Database
```bash
# Conexão direta (terminal novo)
psql -h localhost -U postgres -d recipbot

# Listar tabelas
\dt

# Sair
\q

# Ou GUI: http://localhost:8080 (adminer)
# User: postgres
# Password: postgres
# Database: recipbot
```

### Verificação de Saúde
```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:5173

# Redis
docker-compose exec redis redis-cli ping
```

---

## 📁 Estrutura de Pastas do Projeto

```
recipbot/
│
├── README.md                    # Este arquivo
├── docker-compose.yml           # Orquestração dos serviços
├── Dockerfile.backend           # Container Laravel
├── Dockerfile.frontend          # Container Vue
├── .env.example                 # Variáveis padrão
├── .gitignore                   # Configuração git
├── setup.sh                     # Script de setup
│
├── app/                         # Laravel (criado por setup.sh)
│   ├── Http/Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Jobs/
│   └── Events/
│
├── bootstrap/                   # Laravel bootstrap
├── config/                      # Laravel config
├── database/                    # Migrations e factories
├── public/                      # Assets estáticos
├── resources/                   # Blade templates
├── routes/                      # API routes
├── storage/                     # Logs e cache
├── tests/                       # Testes PHP
│
├── frontend/                    # Vue 3 (criado por setup.sh)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── composables/
│   │   ├── types/
│   │   ├── utils/
│   │   └── App.vue
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── .harness/                    # Pipelines declarativos
│   └── features/
│       ├── recipe-management.yaml
│       └── recipe-search.yaml
│
├── specs/                       # Especificações
│   ├── constitution.md
│   ├── recipe-management.spec.md
│   └── recipe-search.spec.md
│
├── docs/                        # Documentação
│   ├── ARCHITECTURE.md
│   ├── API-SPEC.md
│   ├── DATABASE-SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── SETUP.md
│
├── .claude/                     # Claude Code config
│   ├── subagents.yaml
│   └── config.json
│
└── .github/                     # CI/CD
    └── workflows/
        ├── test.yml
        └── lint.yml
```

---

## 🔐 Segurança (OWASP)

### Autenticação
- JWT com 1h expiration
- Bcrypt password hashing
- Login throttle: 5 tentativas / 15min

### Autorização
- recipe.owner middleware (user só acessa próprias receitas)
- Soft deletes (dados não são permanentemente deletados)

### Validação
- FormRequest validation em todos endpoints
- TypeScript strict mode no frontend
- PHPStan level 8 no backend

### Scraper Protection (SSRF A10)
- Domain whitelist (tudogostoso.com.br, cybercook.com.br, receitas.globo.com)
- Bloqueia IPs privados (10.*, 192.168.*, 172.16-31.*)
- Timeout: 10 segundos
- Limite: 5MB response

Veja **OWASP_CHECKLIST.md** para todos os 10 controles validados.

---

## 🚀 Deployment

### Desenvolvimento
```bash
# Docker local
docker-compose up --build

# Services:
# - Backend: http://localhost:8000
# - Frontend: http://localhost:5173
# - Database: http://localhost:8080 (Adminer)
```

### Staging (AWS RDS)
```bash
# Ainda usando docker-compose localmente
# Mas apontando para RDS via .env
DB_HOST=recipbot-staging.c123.us-east-1.rds.amazonaws.com
```

### Production (Supabase)
```bash
# Deploy com GitHub Actions
# Push para branch main → CI testa → Deploy automático
```

---

## 📚 Documentação Referência

| Arquivo | Tempo | Conteúdo |
|---------|-------|----------|
| **QUICK_START.md** | 5 min | Setup super rápido |
| **constitution.md** | 10 min | 7 princípios + padrões |
| **HARNESS-GUIDE.md** | 15 min | Como trabalhar com harness |
| **OWASP_CHECKLIST.md** | 10 min | Segurança validada |
| **CLAUDE_PROMPT_START.md** | Ref | 8 prompts prontos |

---

## 📊 Tech Stack Detalhes

### Backend
- **Runtime**: PHP 8.2 (Alpine Linux)
- **Framework**: Laravel 11
- **Database**: PostgreSQL 16 (pgvector extension)
- **Cache**: Redis 7
- **Testing**: Pest + Mockery
- **Code Quality**: PHPStan 1.10 (level 8)
- **Linting**: Pint

### Frontend
- **Runtime**: Node 20 (Alpine Linux)
- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript (strict mode)
- **State**: Pinia
- **UI Components**: ShadcN Vue
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest + Testing Library
- **Build**: Vite 5
- **Linting**: ESLint + Prettier

### DevOps
- **Containerization**: Docker 24 + Docker Compose
- **CI/CD**: GitHub Actions
- **Staging**: AWS RDS (PostgreSQL)
- **Production**: Supabase (PostgreSQL + Realtime)

---

## 🎓 Aprender Mais

### Laravel Docs
```bash
# Inside container
php artisan tinker  # Interactive shell
php artisan route:list  # Ver todas rotas
php artisan migration  # Ver status migrations
```

### Vue Docs
```bash
# Componentes reactivos
<script setup lang="ts">
const recipes = ref<Recipe[]>([])
const search = (query: string) => { /* ... */ }
</script>
```

### Database
```bash
# Conectar via psql
psql -h localhost -U postgres -d recipbot

# Ou via GUI
http://localhost:8080
# User: postgres
# Pass: postgres
```

---

## 📞 Próximas Ações

1. ✅ Leia **QUICK_START.md** (5 min)
2. ✅ Leia **constitution.md** (princípios + padrões)
3. ✅ Leia **HARNESS-GUIDE.md** (workflows)
4. ✅ Dispare **PROMPT 1** em CLAUDE_PROMPT_START.md

---

**Versão**: 1.0  
**Data**: 2024-08-27  
**Status**: Pronto para Claude Code

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application running on PHP 8.5. You are an expert with the Laravel ecosystem. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `vendor/bin/sail npm run build`, `vendor/bin/sail npm run dev`, or `vendor/bin/sail composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists (settled decisions, non-obvious traps, standing constraints). Framework and package guidelines that only apply to specific paths (testing, frontend, components) also live there, under `.ai/rules/boost` — this is not just recorded decisions, it is load-bearing guidance you have not seen inline. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.
- Record durable rules with `record-rule` so the next agent or teammate inherits them instead of working them out again. Pass a `glob` (e.g. `app/Http/Controllers/**`), a short `title`, and a few-line `note`. Always use `record-rule`, never your native memory or notes tool — native memory is personal and session-scoped; only `.ai/rules` is shared with the team and persists in the repo.

## Artisan

- Run Artisan commands directly via the command line (e.g., `vendor/bin/sail artisan route:list`). Use `vendor/bin/sail artisan list` to discover available commands and `vendor/bin/sail artisan [command] --help` to check parameters.
- Inspect routes with `vendor/bin/sail artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `vendor/bin/sail artisan config:show app.name`, `vendor/bin/sail artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `vendor/bin/sail artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `vendor/bin/sail artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== sail rules ===

# Laravel Sail

- This project runs inside Laravel Sail's Docker containers. You MUST execute all commands through Sail.
- Start services using `vendor/bin/sail up -d` and stop them with `vendor/bin/sail stop`.
- Open the application in the browser by running `vendor/bin/sail open`.
- Always prefix PHP, Artisan, Composer, and Node commands with `vendor/bin/sail`. Examples:
    - Run Artisan Commands: `vendor/bin/sail artisan migrate`
    - Install Composer packages: `vendor/bin/sail composer install`
    - Execute Node commands: `vendor/bin/sail npm run dev`
    - Execute PHP scripts: `vendor/bin/sail php [script]`
- View all available Sail commands by running `vendor/bin/sail` without arguments.

=== tests rules ===

# Test Enforcement

- Test every code change by adding or updating a test.
- Run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `vendor/bin/sail artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `vendor/bin/sail artisan list` and check their parameters with `vendor/bin/sail artisan [command] --help`.
- If you're creating a generic PHP class, use `vendor/bin/sail artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `vendor/bin/sail artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `vendor/bin/sail artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `vendor/bin/sail npm run build` or ask the user to run `vendor/bin/sail npm run dev` or `vendor/bin/sail composer run dev`.

=== laravel/v11 rules ===

# Laravel 11

- CRITICAL: ALWAYS use `search-docs` tool for version-specific Laravel documentation and updated code examples.
- Laravel 11 brought a new streamlined file structure which this project now uses.

## Laravel 11 Structure

- In Laravel 11, middleware are no longer registered in `app/Http/Kernel.php`.
- Middleware are configured declaratively in `bootstrap/app.php` using `Application::configure()->withMiddleware()`.
- `bootstrap/app.php` is the file to register middleware, exceptions, and routing files.
- `bootstrap/providers.php` contains application specific service providers.
- No app\Console\Kernel.php - use `bootstrap/app.php` or `routes/console.php` for console configuration.
- Commands auto-register - files in `app/Console/Commands/` are automatically available and do not require manual registration.

## Database

- When modifying a column, the migration must include all of the attributes that were previously defined on the column. Otherwise, they will be dropped and lost.

- Laravel 11 allows limiting eagerly loaded records natively, without external packages: `$query->latest()->limit(10);`.

### Models

- Casts can and likely should be set in a `casts()` method on a model rather than the `$casts` property. Follow existing conventions from other models.

## New Artisan Commands

- List Artisan commands using Boost's MCP tool, if available. New commands available in Laravel 11:
    - `vendor/bin/sail artisan make:enum`
    - `vendor/bin/sail artisan make:class`
    - `vendor/bin/sail artisan make:interface`

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/sail bin pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/sail bin pint --test --format agent`, simply run `vendor/bin/sail bin pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `vendor/bin/sail artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `vendor/bin/sail artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/sail bin pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `vendor/bin/sail artisan test --compact`.

</laravel-boost-guidelines>
