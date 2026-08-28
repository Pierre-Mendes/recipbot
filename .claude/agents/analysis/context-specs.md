# Specifications Context - AnalysisAgent

## 📋 User Stories & Requirements

Este arquivo contém todas as especificações, user stories e requisitos do RecipBot MVP.

---

## 🎯 Project Mission

**RecipBot MVP** é uma aplicação web para **gerenciar receitas pessoais** com foco em:
- ✅ Adicionar receitas (manual, por link, scraper, OCR)
- ✅ Organizar por tags
- ✅ Buscar receitas rapidamente
- 🚀 Futuro: Análise nutricional, cardápios semanais

---

## 📊 MVP Specifications

| Aspecto | Valor |
|---------|-------|
| **Custo** | $0 (zero APIs pagas) |
| **Timeline** | 6 semanas (225 horas) |
| **Features** | Manual + Link + Scraper + Tags + Search |
| **Escala** | 1 usuário → 1000 usuários |
| **Tech Stack** | Laravel 11 + Vue 3 + PostgreSQL + Redis |

---

## 📖 User Stories

### US-01: User Registration & Login

**Como** novo usuário  
**Quero** registrar e fazer login  
**Para** gerenciar minhas receitas pessoais  

**Acceptance Criteria:**
- [ ] POST /api/register - registrar novo usuário
  - Email obrigatório (validado)
  - Senha obrigatória (min 8 caracteres)
  - Retorna JWT token
  - Salva password hashed (bcrypt)
  
- [ ] POST /api/login - fazer login
  - Email + password
  - Retorna JWT token (1h expiration)
  - Rate limit: 5 tentativas / 15 min
  
- [ ] GET /api/me - obter dados do usuário
  - Requer autenticação
  - Retorna user info (sem password)

**Estimation:** 2 horas  
**Status:** ✅ Completo (PR #3)

---

### US-02: Create Recipe Manually

**Como** usuário  
**Quero** adicionar receita digitando os dados  
**Para** salvar receitas que não estão na internet  

**Acceptance Criteria:**
- [ ] POST /api/recipes - criar receita
  - Campos: title, ingredients[], instructions, tags[], prep_time, cook_time, source_url (optional)
  - Validação FormRequest
  - Salva com UUID PK
  - Retorna receita criada
  
- [ ] PUT /api/recipes/:id - editar receita
  - Autorização (owner only)
  - Validação completa
  - Retorna receita atualizada
  
- [ ] GET /api/recipes - listar receitas do usuário
  - Paginação (15 por página)
  - Ordenado por data (newer first)
  - Retorna array de receitas

**Estimation:** 3 horas  
**Status:** ✅ Completo (PR #2)

---

### US-03: Delete Recipe

**Como** usuário  
**Quero** deletar receitas que não preciso  
**Para** manter minha coleção organizada  

**Acceptance Criteria:**
- [ ] DELETE /api/recipes/:id - deletar receita
  - Autorização (owner only)
  - Soft delete (preserve data)
  - Retorna 204 No Content
  
- [ ] GET /api/recipes/:id - obter receita
  - Autorização (owner only)
  - Não retorna deletadas
  - Retorna receita completa

**Estimation:** 1 hora  
**Status:** ✅ Completo (PR #2)

---

### US-04: Recipe Ingestion from URL (Scraper)

**Como** usuário  
**Quero** adicionar receita de um link (tudogostoso, cybercook, etc)  
**Para** reusar receitas já publicadas  

**Acceptance Criteria:**
- [ ] POST /api/recipes/from-url - scraper endpoint
  - Input: URL
  - SSRF Protection:
    - Whitelist: tudogostoso.com.br, cybercook.com.br, receitas.globo.com
    - Block private IPs (RFC 1918)
    - Timeout: 10 segundos
    - Max response: 5MB
  - Parse HTML (open_page_parser or similar)
  - Extract: title, ingredients, instructions
  - Retorna Recipe com extracted data
  
- [ ] Valida URL antes de scraping
- [ ] Timeout graceful (não pendurar)
- [ ] Retorna erro se URL inválida

**Estimation:** 4 horas  
**Status:** ✅ Completo (PR #5)

---

### US-05: Hybrid Recipe Search

**Como** usuário  
**Quero** buscar receitas por tags e linguagem natural  
**Para** encontrar receitas rapidamente  

**Acceptance Criteria:**
- [ ] GET /api/recipes/search/tags - buscar por tags
  - Query param: tags[] (array)
  - AND logic (all tags)
  - Retorna array de receitas
  - Índice GIN otimizado (<50ms)
  
- [ ] GET /api/recipes/search - busca híbrida
  - Query param: q (natural language)
  - Busca title + instructions
  - Full-text search
  - Paginated results
  - Performance: <200ms
  
- [ ] GET /api/recipes/tags/autocomplete - sugestões
  - Retorna lista de tags populares
  - Cache: 1 hora
  - Performance: <10ms (cache hit)

- [ ] Redis cache strategy
  - Tag search: 1 hora TTL
  - Autocomplete: 24 horas TTL
  - Invalidate on recipe change

**Estimation:** 5 horas  
**Status:** ✅ Completo (PR #6)

---

### US-06: Frontend - Recipe CRUD UI

**Como** usuário  
**Quero** interface bonita para CRUD de receitas  
**Para** gerenciar receitas facilmente  

**Acceptance Criteria:**
- [ ] Home Page (/)
  - Logged out: Login/Register buttons
  - Logged in: Recent recipes + quick add button
  
- [ ] Recipes Page (/recipes)
  - List de todas receitas
  - Paginado (15 per page)
  - Edit/Delete buttons por receita
  - Responsivo (mobile, tablet, desktop)
  
- [ ] Recipe Form (create/edit)
  - Campos: title, ingredients[], instructions, tags[], times
  - Validação client-side (TypeScript)
  - Submit button + loading state
  - Error messages
  
- [ ] Search Page (/search)
  - Search bar (tags + full-text)
  - Results paginated
  - Filters por dificuldade, tempo
  - Sort options
  
- [ ] Recipe Detail (/recipes/:id)
  - Display completo
  - Edit/Delete buttons (if owner)
  - Share recipe button (future)

- [ ] Dark mode support
  - Toggle button
  - Persist preference
  - Smooth transitions

**Estimation:** 8 horas  
**Status:** ✅ Completo (PR #7)

---

### US-07: E2E Tests

**Como** desenvolvedor  
**Quero** testes automatizados end-to-end  
**Para** validar fluxos completos de usuário  

**Acceptance Criteria:**
- [ ] Playwright suite
  - Testa: login → create recipe → search → view → delete
  - API-level auth (bypass throttle)
  - Headless browser
  - Screenshots on failure
  
- [ ] Tests scenarios:
  1. User registration & login
  2. Create recipe (manual)
  3. Edit recipe
  4. Search by tags
  5. Delete recipe
  6. Logout
  
- [ ] Performance assertions
  - Page load <3s
  - Search results <500ms
  
- [ ] Run in CI/CD

**Estimation:** 4 horas  
**Status:** ✅ Completo (PR #8)

---

## 🔄 Feature Phases

### Phase 1: Database (Week 1) ✅
- User model + soft deletes
- Recipe model + UUID
- Migrations
- Indices (GIN, full-text)

### Phase 2: Backend API (Week 2-3) ✅
- RecipeController (CRUD)
- AuthController (register, login, refresh)
- RecipeScraperService (SSRF protected)
- RecipeSearchService (tags + full-text)
- Testes (>80% coverage)

### Phase 3: Frontend (Week 3-4) ✅
- Components (RecipeForm, RecipeCard, RecipeSearch)
- Pages (Home, Recipes, Search, Profile)
- Pinia stores (auth, recipes)
- Responsivo (mobile-first)
- Testes (>70% coverage)

### Phase 4: E2E & Polish (Week 5-6) ✅
- Playwright tests
- Dark mode
- Performance optimization
- Deployment prep

---

## 📐 Data Model

### Users Table
```sql
id (UUID) PRIMARY KEY
email (unique)
password (hashed bcrypt)
name
created_at
updated_at
deleted_at (soft delete)
```

### Recipes Table
```sql
id (UUID) PRIMARY KEY
user_id (foreign key → users)
title (string)
ingredients (JSON array)
instructions (text)
tags (JSON array) -- GIN indexed
source_url (nullable)
prep_time_minutes (int)
cook_time_minutes (int)
created_at
updated_at
deleted_at (soft delete)
```

### Indices
```sql
-- User isolation
INDEX (user_id)

-- Tag search
INDEX (tags) USING GIN

-- Title search
FULLTEXT INDEX (title, instructions)

-- Soft delete
INDEX (deleted_at)

-- Sorting
INDEX (created_at DESC)
```

---

## 🎨 Frontend Routes

```
/                    - Home page
/recipes             - List all recipes
/recipes/create      - Create form
/recipes/:id         - Recipe detail
/recipes/:id/edit    - Edit form
/search              - Search page
/profile             - User profile
/profile/settings    - Settings
/login               - Login page
/register            - Register page
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/register        - Register user
POST   /api/login           - Login user
POST   /api/logout          - Logout (future)
POST   /api/refresh         - Refresh JWT
GET    /api/me              - Current user
```

### Recipes CRUD
```
GET    /api/recipes         - List user recipes (paginated)
POST   /api/recipes         - Create recipe
GET    /api/recipes/:id     - Get recipe
PUT    /api/recipes/:id     - Update recipe
DELETE /api/recipes/:id     - Delete recipe
```

### Scraper
```
POST   /api/recipes/from-url    - Scrape recipe from URL
```

### Search
```
GET    /api/recipes/search              - Hybrid search (query param)
GET    /api/recipes/search/tags         - Search by tags (array)
GET    /api/recipes/tags/autocomplete   - Tag suggestions
```

---

## ✅ Acceptance Criteria Summary

### All User Stories
```
✅ US-01: Auth (register, login, me)
✅ US-02: Create/Edit/List recipes
✅ US-03: Delete recipe (soft delete)
✅ US-04: Scraper (SSRF protected)
✅ US-05: Search (tags + full-text + cache)
✅ US-06: Frontend UI (responsive, dark mode)
✅ US-07: E2E tests (Playwright)
```

### Quality Gates
```
✅ >80% backend coverage
✅ >70% frontend coverage
✅ PHPStan level 8
✅ ESLint passing
✅ OWASP checklist
✅ Performance <200ms (backend), <3s (frontend)
✅ All E2E tests passing
```

---

## 🚀 Definition of Done

Feature é "done" quando:
1. ✅ Código implementado (backend + frontend)
2. ✅ Testes escritos (>80% coverage)
3. ✅ Code review aprovado
4. ✅ Security audit passed
5. ✅ Performance validated
6. ✅ Documentation updated
7. ✅ Merged to main
8. ✅ Deployed to staging

