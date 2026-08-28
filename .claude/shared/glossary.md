# Glossary - Shared Context

## 🔤 Termos Técnicos Globais

### Core Entities

**Recipe (Receita)**
- Documento principal do sistema
- Contém: título, ingredientes, modo de preparo, tags, tempos
- Propriedade: cada usuário tem suas próprias receitas
- Exemplo: "Bolo de Chocolate" com ingredientes, modo de preparo

**User (Usuário)**
- Pessoa que usa o sistema
- Autenticado via JWT
- Tem múltiplas receitas (1 para N)
- Exemplo: pierre@example.com

**Tag (Etiqueta)**
- Categoria/classificação de receita
- Texto simples (ex: "dessert", "chocolate")
- Múltiplas por receita
- Armazenado em JSON array

**Ingredient (Ingrediente)**
- Componente de uma receita
- Armazenado como string simples
- Sem unidades (futuro: support units)
- Exemplo: "2 ovos", "200g de chocolate"

**Draft (Rascunho)**
- Receita em fase de confirmação (futuro)
- Criada via scraper/OCR
- Aguarda edição/confirmação do usuário
- Não publicada até confirmação

---

### Technical Terms

**API (Application Programming Interface)**
- Interface de comunicação frontend ↔ backend
- REST architecture neste projeto
- JSON request/response format
- HTTP methods: GET, POST, PUT, DELETE

**JWT (JSON Web Token)**
- Método de autenticação stateless
- Token contém dados do usuário
- Expira em 1 hora
- Enviado em header: Authorization: Bearer {token}

**UUID (Universally Unique Identifier)**
- Identificador global único (string)
- Usado como primary key em vez de auto-increment
- 36 caracteres (ex: "550e8400-e29b-41d4-a716-446655440000")
- Melhor para: distribuição, privacidade

**GIN Index (Generalized Inverted Index)**
- Índice PostgreSQL para JSON arrays
- Otimiza: WHERE tags @> '["dessert"]'
- Performance: <50ms mesmo com 1M registros
- Usado em: tags

**Full-Text Search (FTS)**
- Busca por palavras em texto
- Índice especial em: title, instructions
- Performance: <200ms
- Suporta: operadores AND, OR, NOT

**ORM (Object-Relational Mapping)**
- Eloquent (Laravel)
- Mapeia classes para tabelas
- Provides: type-safe queries, relationships
- Exemplo: Recipe::where(...)->get()

**OWASP (Open Web Application Security Project)**
- Top 10 vulnerabilidades web
- Neste projeto: SQL Injection, XSS, SSRF, Auth, etc
- Security auditing checklist
- Compliance: OWASP Top 10 2021

---

### Backend-Specific Terms

**Service (Serviço)**
- Classe com lógica de negócio
- Não contém HTTP/Controller logic
- Injetável (dependency injection)
- Exemplo: RecipeService, RecipeSearchService

**Controller (Controlador)**
- HTTP request handler
- Define endpoints (rotas)
- Delega para Services
- Retorna JSON responses

**Model (Modelo)**
- Eloquent model (database)
- Define fillable, casts, relationships
- Não contém lógica complexa
- Exemplo: Recipe, User

**Repository (Repositório)**
- Data access layer (futuro)
- Abstrai queries de banco
- Permite mock em testes
- Não implementado ainda (usar Services)

**Migration (Migração)**
- Arquivo de versionamento de schema
- Define: CREATE TABLE, ALTER TABLE, DROP TABLE
- Revertível (up/down)
- Exemplo: CreateRecipesTable.php

**Policy (Política)**
- Authorization rules (Autorização)
- Define who can do what
- Exemplo: RecipePolicy (view, edit, delete)
- Usado em: $this->authorize('view', $recipe)

**FormRequest (Requisição de Formulário)**
- Validation layer
- Rules, messages, authorize
- Automático em controllers
- Exemplo: StoreRecipeRequest

---

### Frontend-Specific Terms

**Component (Componente)**
- Vue Single File Component (.vue)
- Reusável, encapsulado
- Props + Events + Slot
- Exemplo: RecipeCard.vue, RecipeForm.vue

**Page (Página)**
- Vue component que representa uma rota
- Maior escala (usa múltiplos componentes)
- Vinculado a URL via router
- Exemplo: RecipesPage.vue

**Store (Loja de Estado)**
- Pinia store para state management
- State + Actions + Getters
- Centraliza dados compartilhados
- Exemplo: useRecipesStore, useAuthStore

**Composable (Componível)**
- Função que retorna estado + lógica reusável
- Padrão Vue Composition API
- Use em múltiplos componentes
- Exemplo: useRecipes(), useAuth()

**Router (Roteador)**
- Vue Router para navegação
- Define rotas (paths → components)
- Lazy loading de páginas
- Exemplo: /recipes/:id

**State (Estado)**
- Dados reativos da aplicação
- Gerenciado via Pinia
- Reativo: mudança atualiza UI
- Exemplo: recipes[], isLoading

**Action (Ação)**
- Função no store que muta estado
- Async (chamadas API)
- Disparada via store.action()
- Exemplo: fetchRecipes(), deleteRecipe()

**Getter (Pegador)**
- Propriedade computada do store
- Derived state (não precisa de action)
- Cacheado automaticamente
- Exemplo: sortedRecipes, recipeCount

---

### DevOps/Deployment

**Docker**
- Container platform
- Services: app, frontend, postgres, redis, adminer
- docker-compose.yml orquestra
- Isolamento: cada container rodas isolado

**PostgreSQL 16**
- Banco de dados relacional
- Suporta: JSON, arrays, full-text search
- Extension: pgvector (futuro: AI embeddings)
- Driver: PDO (Laravel)

**Redis**
- Cache em-memory
- Armazena: tag suggestions (24h), search results (1h)
- Performance: <10ms hit
- Protocol: RESP

**GitHub Actions**
- CI/CD pipeline
- Roda: testes, análise estática, security checks
- Trigger: push, pull request
- Jobs: test, phpstan, pint, semgrep, etc

**Heroku**
- Platform as a Service (PaaS)
- Deploy: git push heroku main
- Scaling: dynos
- Database: Heroku PostgreSQL

---

### Security Terms

**SSRF (Server-Side Request Forgery)**
- Vulnerabilidade: servidor faz request não autorizado
- Neste projeto: usuario pede para scraper acessar URL privada
- Prevenção: whitelist domains + block RFC 1918 IPs
- Exemplo: scraper tentando acessar http://localhost:8000

**SQL Injection**
- Vulnerabilidade: dados do user modificam SQL
- Prevenção: parameterized queries (Eloquent ORM)
- Exemplo: WHERE title LIKE "%{$input}%" ← BAD

**XSS (Cross-Site Scripting)**
- Vulnerabilidade: script injetado no HTML
- Prevenção: escape by default (Vue {{}} vs v-html)
- Exemplo: {{ userContent }} ← SAFE vs v-html ← RISKY

**CORS (Cross-Origin Resource Sharing)**
- Controla quem pode fazer requests
- config/cors.php permite localhost:5173 (frontend)
- Bloqueia: requests de outras origens
- Headers: Access-Control-Allow-Origin

**JWT Token**
- Autenticação stateless
- Claims: user_id, expiration, signature
- Enviado: Authorization: Bearer {token}
- Risco: se vazado, pode ser usado até expirar

**Soft Delete**
- Não deleta fisicamente do banco
- Adiciona timestamp deleted_at
- Queries ignoram deleted_at IS NOT NULL
- Preserva: histórico, relacionamentos

---

### Performance Terms

**N+1 Query Problem**
- Faz muitas queries quando deveria fazer poucas
- Exemplo: SELECT users (1) + SELECT recipes (N) por user
- Solução: eager loading with() ou select específico

**Eager Loading**
- Carrega relacionamentos em 1 query
- Syntax: Recipe::with('user')->get()
- Vs Lazy Loading: Recipe::all() depois $r->user

**Caching**
- Armazena resultado em Redis
- TTL: time-to-live (quando expira)
- Hit/Miss: acertou/errou cache
- Strategy: remember, forget, flush

**Pagination**
- Retorna 15 items por página
- Evita: carregar 1M registros de uma vez
- Cursor-based: melhor para grandes datasets
- Offset-based: simples para pequenos

**Benchmarking**
- Mede performance (tempo)
- Targets: backend <200ms, frontend <3s
- Tools: Telescope, Lighthouse, wrk
- Cadeia: profile → fix → measure

---

### Testing Terms

**Unit Test (Teste Unitário)**
- Testa 1 função/método em isolamento
- Mocks: dependências
- Framework: Pest (backend), Vitest (frontend)

**Feature Test (Teste de Feature)**
- Testa endpoint completo
- Com database real (transações)
- Framework: Pest
- Exemplo: POST /api/recipes e valida response

**E2E Test (End-to-End)**
- Testa fluxo completo do usuário
- Browser real: Playwright
- Exemplo: login → create recipe → search → delete

**Coverage (Cobertura)**
- Percentual de código testado
- Target: >80% (backend), >70% (frontend)
- Tools: php coverage, vitest --coverage

**Mock**
- Objeto fake para testes
- Simula comportamento
- Permite isolar componente
- Exemplo: MockRecipeService

**Assertion**
- Statement que valida resultado
- expect(x).toBe(y)
- assert(condition)
- Framework: expect (Vitest), expect (Pest)

---

### Database Terms

**Primary Key (Chave Primária)**
- Identificador único por linha
- Neste projeto: UUID (não auto-increment)
- Acelera: lookups, joins

**Foreign Key (Chave Estrangeira)**
- Referência para outra tabela
- Exemplo: recipes.user_id → users.id
- Garante: integridade referencial

**Index (Índice)**
- Estrutura que acelera queries
- Types: BTREE (default), GIN (JSON), FULLTEXT
- Trade-off: mais rápido SELECT, mais lento INSERT

**Soft Delete**
- deleted_at timestamp
- Queries filtram: WHERE deleted_at IS NULL
- Preserve: histórico, relacionamentos

**Schema (Esquema)**
- Definição de tabelas/colunas
- Migration: versiona schema
- DDL (Data Definition Language): CREATE, ALTER, DROP

---

### Glossário Rápido

| Termo | Significado | Exemplo |
|-------|-------------|---------|
| **API** | Interface cliente-servidor | GET /api/recipes |
| **JWT** | Token de autenticação | Authorization: Bearer xyz |
| **UUID** | ID único global | 550e8400-e29b-41d4... |
| **ORM** | Mapeador objeto-relacional | Recipe::where(...) |
| **OWASP** | Checklist de segurança | Injection, XSS, SSRF |
| **GIN** | Índice para JSON | tags USING GIN |
| **FTS** | Busca full-text | MATCH(title, instr) |
| **Cache** | Armazenamento em-memory | Redis TTL |
| **Pagination** | Dividir resultados | LIMIT 15 OFFSET 0 |
| **N+1** | Muitas queries | SELECT user, then SELECT recipes |
| **SSRF** | Request não autorizado | Scraper acessa localhost |
| **XSS** | Injeção de script | v-html com userInput |
| **Soft Delete** | Não deleta fisicamente | deleted_at timestamp |
| **E2E** | Teste ponta-a-ponta | Playwright |
| **Coverage** | Percentual testado | >80% code testado |

