# RecipBot Project Structure Context - CodingAgent

## 📂 Estrutura Geral do Projeto

```
recipbot/
├── README.md
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
├── .gitignore
├── setup.sh
│
├── app/                          # Laravel Backend
│   ├── Http/Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Jobs/
│   ├── Events/
│   └── ...
│
├── frontend/                     # Vue 3 Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── types/
│   │   └── ...
│   └── package.json
│
├── .claude/                      # Claude Code Config
│   ├── config.json
│   ├── subagents.yaml
│   └── agents/
│
├── .harness/                     # Pipelines Declarativos
│   └── features/
│       ├── recipe-ingestion.yaml
│       ├── recipe-search.yaml
│       └── recipe-management.yaml
│
├── specs/                        # Especificações Executáveis
│   ├── constitution.md
│   ├── recipe-ingestion.spec.md
│   ├── recipe-search.spec.md
│   └── recipe-management.spec.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API-SPEC.md
│   ├── DATABASE-SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── SETUP.md
│
├── database/
│   ├── migrations/
│   └── seeders/
│
└── .github/
    └── workflows/
        ├── ci.yml
        └── lint.yml
```

---

## 🔤 Convenções de Naming

### PHP (Backend)
```
Functions:        snake_case
Classes:          PascalCase
Methods:          camelCase
Properties:       camelCase
Constants:        UPPER_SNAKE_CASE
Namespaces:       PascalCase\With\Backslash
Files:            PascalCase.php
```

**Exemplos:**
```php
// Class
class RecipeController { }

// Method
public function indexRecipes() { }

// Property
private $recipes;

// Constant
const DEFAULT_LIMIT = 15;

// Function
function format_date($date) { }
```

### JavaScript/TypeScript (Frontend)
```
Functions:        camelCase
Classes:          PascalCase
Constants:        UPPER_SNAKE_CASE (se imutável)
Variables:        camelCase
Interfaces:       PascalCase
Files:            PascalCase.vue ou camelCase.ts
```

**Exemplos:**
```typescript
// Interface
interface RecipeFormData { }

// Function
function fetchRecipes() { }

// Constant
const API_BASE_URL = 'http://localhost:8000'

// Variable
const recipes = ref([])

// File
RecipeCard.vue
recipeService.ts
```

---

## 📋 Git Workflow

### Branch Naming
```
Feature:    feat/description-here
Bugfix:     fix/description-here
Refactor:   refactor/description-here
Hotfix:     hotfix/description-here
Test:       test/description-here
Docs:       docs/description-here

Examples:
feat/recipe-export-pdf
fix/ssrf-validation
refactor/search-service
```

### Commit Format
```
type(scope): description

Allowed types:
- feat:     new feature
- fix:      bug fix
- refactor: refactoring (no behavior change)
- test:     adding tests
- docs:     documentation only
- style:    formatting (prettier, lint)
- perf:     performance improvement
- ci:       CI/CD changes

Scope (optional):
- backend
- frontend
- database
- docker
- testing
- docs

Examples:
feat(backend): create POST /api/recipes/from-url
fix(frontend): recipe card not updating after save
refactor(backend): extract search logic to service
test(backend): add unit tests for RecipeService
```

### Commit Size
- ✅ Micro commits (<400 lines, 1 responsibility)
- ❌ Giant commits (>1000 lines)

### Push Strategy
```
1. Create feature branch (feat/...)
2. Make micro commits (1 per behavior)
3. Push to origin
4. Create PR (with description)
5. Wait for CI/CD (all green)
6. Request review
7. Address comments
8. Merge to main
```

---

## 🚀 Development Workflow

### Daily Development
```bash
# Morning
git pull origin main
git checkout -b feat/my-feature

# Work
# ... make changes ...

# Micro commit
git add app/Services/RecipeService.php
git commit -m "feat(backend): add recipe search by tags"

# More work
git add app/Http/Controllers/RecipeController.php
git commit -m "feat(backend): create search endpoint"

# Push
git push -u origin feat/my-feature

# Create PR on GitHub
# ... wait for review ...

# Address comments
git add .
git commit -m "fix: update recipe service based on review"
git push

# Merge to main (after approval)
```

### Testing Before Push
```bash
# Backend
php artisan test
phpstan analyse app/
pint app/

# Frontend
npm run test
npm run lint
npm run format

# E2E
npm run test:e2e
```

---

## 📦 Dependencies (Key Packages)

### Backend (Laravel 11)
- laravel/framework ^11.0
- laravel/sanctum (API auth)
- pgvector/pgvector-php (AI embeddings)
- guzzlehttp/guzzle (HTTP client)
- laravel/pint (code formatter)
- phpstan/phpstan (static analysis)
- pestphp/pest (testing)

### Frontend (Vue 3)
- vue ^3.3
- typescript ^5.0
- pinia (state management)
- vue-router ^4.0
- tailwindcss ^4.0
- vitest (testing)
- @vue/test-utils (component testing)
- axios (HTTP client)
- shadcn-vue (UI components)

---

## 🔐 Environment Variables

### Backend (.env)
```
APP_NAME=RecipBot
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=recipbot
DB_USERNAME=postgres
DB_PASSWORD=postgres

CACHE_DRIVER=redis
REDIS_HOST=redis
REDIS_PORT=6379

JWT_SECRET=your-secret-key
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=RecipBot
VITE_APP_VERSION=1.0.0
```

---

## 🐳 Docker Setup

### Services
```yaml
app:           Laravel 11 (PHP 8.2)
frontend:      Node 20 (Vue 3)
postgres:      PostgreSQL 16
redis:         Redis 7
adminer:       Database GUI (port 8080)
```

### Commands
```bash
# Start all
docker-compose up --build

# Stop
docker-compose down

# Backend shell
docker-compose exec app bash

# Frontend shell
docker-compose exec frontend sh

# Database
docker-compose exec postgres psql -U postgres -d recipbot
```

---

## 🧪 Testing Standards

### Backend (PHP)
- Framework: Pest
- Coverage: >80%
- Types: Unit + Feature tests
- Location: `tests/`

```bash
# Run all
php artisan test

# Specific test
php artisan test --filter RecipeTest

# With coverage
php artisan test --coverage
```

### Frontend (Vue)
- Framework: Vitest + Testing Library
- Coverage: >70%
- Types: Unit + Integration tests
- Location: `src/**/__tests__/*.spec.ts`

```bash
# Run all
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

---

## 📊 Code Quality Tools

### Backend
- **PHPStan** (level 8)
  ```bash
  phpstan analyse app/
  ```

- **Pint** (code formatter)
  ```bash
  pint app/
  ```

- **Composer Audit**
  ```bash
  composer audit
  ```

### Frontend
- **ESLint**
  ```bash
  npm run lint
  ```

- **Prettier**
  ```bash
  npm run format
  ```

- **TypeScript Compiler**
  ```bash
  npx tsc --noEmit
  ```

---

## 🔍 CI/CD Pipeline

### GitHub Actions (ci.yml)
```yaml
Jobs:
1. test         - Run all tests
2. phpstan      - Static analysis
3. pint         - Code formatting
4. composer-audit - Dependency audit
5. semgrep      - Security scanning
6. trufflehog   - Secret detection
7. dast         - Dynamic security
8. quality_gate - Minimum standards
```

### Branch Protection
```
Before merge to main:
- ✅ All tests passing
- ✅ Coverage >80% (backend), >70% (frontend)
- ✅ No security issues
- ✅ 1+ reviewer approval
- ✅ No conflicts with main
```

---

## 📈 Performance Targets

### Backend Response Time
- API endpoint: <200ms
- Database query: <50ms
- Cache hit: <10ms

### Frontend Performance
- Page load: <3s
- Component render: <100ms
- Search results: <500ms

### Database Performance
- Recipes query (10): <100ms
- Search by tags: <50ms (with GIN index)
- Full-text search: <200ms (with index)

---

## 🗂️ Important Files to Know

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project overview + setup |
| `constitution.md` | Design principles + patterns |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/API-SPEC.md` | API documentation |
| `docs/DATABASE-SCHEMA.md` | Database schema |
| `docker-compose.yml` | Service orchestration |
| `.env.example` | Environment template |
| `.github/workflows/ci.yml` | CI/CD pipeline |

---

## 🎯 Quick Reference

### Setup New Developer
```bash
git clone <repo>
cd recipbot
cp .env.example .env
docker-compose up --build
docker-compose exec app php artisan migrate
```

### Daily Development
```bash
git pull origin main
git checkout -b feat/my-feature
# ... make changes, test ...
git push -u origin feat/my-feature
# ... create PR, wait for review ...
```

### Before Committing
```bash
# Backend
php artisan test
phpstan analyse app/
pint app/

# Frontend
npm run test
npm run lint
npm run format
```

### Deploy Staging
```bash
git checkout main
git pull origin main
docker-compose up --build
# ... run migrations ...
```

