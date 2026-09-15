# 🗺️ RecipBot — Plano dos Próximos Passos

> Documento-base para conduzir o desenvolvimento via **Claude Code CLI**.
> Cada tarefa traz um *prompt pronto* para colar no CLI. Data-base: 2026-09-15.

---

## 1. Estado atual (o que já está em `main`)

**Backend (Laravel 11 + PostgreSQL + Redis)**
- ✅ Auth JWT: register, login, logout, `me`, **editar perfil** (`PATCH /auth/me`), **trocar senha** (`PUT /auth/password`); throttle 5/15min
- ✅ Receitas CRUD (owner-only, soft delete) — `apiResource('recipes')`
- ✅ Campo `instructions` (modo de preparo) nas receitas
- ✅ Import por URL: `POST /recipes/from-url`, `POST /recipes/preview-url`, `GET /recipes/drafts/{draft}` (scraper + fluxo de rascunho/preview)
- ✅ Proteção SSRF (`SsrfGuard`, `DnsHostResolver`, whitelist de domínios)
- ✅ Busca: `POST /recipes/search` + `GET /tags` (índices GIN de tags e `pg_trgm`, cache Redis)
- ✅ Qualidade: PHPStan level 8, Pint, Pest, cobertura ≥80%

**Frontend (Vue 3 + TS strict + Vite + Tailwind)**
- ✅ Páginas: Login, Register, Lista, Detalhe, Formulário (criar/editar), **Perfil**, NotFound
- ✅ UI kit próprio (Button, Card, Input, Pagination, Skeleton, ConfirmDialog, Toast), dark mode
- ✅ Stores Pinia (auth, recipes), guards de rota, cliente Axios com interceptors 401

**Correções recentes já mescladas (esta sessão)**
- ✅ Tela de **editar/detalhe em branco** — removida a `<Transition mode="out-in">` que travava rotas lazy; normalização robusta das respostas da API (`normalizeRecipe`/`unwrapRecipe`) + guards null-safe. (PR #17 → `feat/adjust-frontend` → `main`)

---

## 2. Pendências conhecidas (P0 — resolver antes de features novas)

### 2.1 🐞 Atraso de 5+ segundos ao criar receita
Sintoma relatado: após "Criar receita", o redirecionamento para o detalhe demora 5+ segundos.
Não é o bug de renderização (esse já foi corrigido) — provável latência de backend/infra.

**Hipóteses a investigar (nesta ordem):**
1. Resolução de `localhost` → IPv6 (`::1`) antes de IPv4 no cliente/entre serviços (timeout ~fixo).
2. Conexão Redis (predis) lenta/timeout em cache/session/queue no primeiro hit.
3. Listener/evento síncrono no `create` (ex.: invalidação de cache de busca) fazendo trabalho custoso inline.
4. `QUEUE_CONNECTION=redis` disparando job síncrono ou conexão pendente.

**Prompt para o CLI:**
```
Investigue o atraso de ~5s ao criar uma receita no RecipBot. Meça o tempo de
POST /api/recipes isoladamente (curl -w tempo_total) contra o backend rodando
via docker-compose. Cheque: resolução DNS localhost/IPv6, latência do Redis
(predis) em cache/session/queue, e qualquer listener síncrono no fluxo de
RecipeService::create. Traga a causa raiz com evidência (timings antes/depois),
proponha e aplique o fix mínimo, com teste que fixe o comportamento. Rode a
suíte + phpstan + pint antes de abrir PR.
```

### 2.2 🌿 Triagem das 8 branches de feature fora do `main`
Existem branches encadeadas (features experimentais autônomas) **não** mescladas em `main`.
Decida, por feature: **manter** (abrir PR limpo contra o `main` atual) ou **descartar** (deletar branch).

| Branch | Feature | Sinais |
|--------|---------|--------|
| `feat/recipe-notes` | Campo de nota livre na receita | requer migration `notes` |
| `feat/structured-list-editor` | Editor estruturado de ingredientes/passos | componente ListEditor |
| `feat/quantity-highlight` | Parse + destaque de quantidades | frontend |
| `feat/unit-converter` | Conversão g/ml/xícaras | frontend/util |
| `feat/recipe-spreadsheet-export` | Import/export `.xlsx` | dep nova (backend/js) |
| `feat/recipe-pdf-export` | Export PDF da receita | dep nova (dompdf/js) |
| `feat/ocr-import` | Ler receita de PDF/foto (OCR PT) | Tesseract |
| `feat/import-draft-review` | Revisão de rascunho importado | encadeada em notes |

> ⚠️ Como o `main` avançou, essas branches provavelmente têm **conflito**. A recomendação
> é **re-implementar a feature escolhida a partir do `main` atual** em vez de mesclar a branch
> antiga (evita arrastar histórico encadeado). Use a branch antiga só como referência.

**Prompt para o CLI (por feature escolhida):**
```
Quero integrar a feature <NOME> ao RecipBot. Existe a branch de referência
origin/feat/<NOME> (encadeada e possivelmente conflitante com o main atual).
NÃO faça merge dela: leia o diff dela contra o main como referência, e
re-implemente a feature limpa a partir do main atual, seguindo os padrões do
projeto (Services + FormRequest no backend, Pinia/composables no front, testes
Pest/Vitest, PHPStan 8, Pint, cobertura ≥80%). Abra 1 PR pequeno e focado.
```

### 2.3 🧹 Limpeza de branches
Há **31 branches remotas** (muitas `copilot/*`, `backup-*`, e as encadeadas acima).
Depois da triagem 2.2, deletar as obsoletas para o repositório ficar navegável.

---

## 3. Roadmap priorizado (P1 — features de produto)

Ordenar pelo valor para o usuário final (princípio *User-Centric* da constitution).
Recomendação de ordem:

1. **Estruturar ingredientes/passos** (`structured-list-editor`) — melhora entrada de dados e destrava conversão/nutrição depois.
2. **Notas na receita** (`recipe-notes`) — barato, alto valor.
3. **Conversão de unidades + destaque de quantidade** (`unit-converter`, `quantity-highlight`).
4. **Exportar receita** (PDF e/ou `.xlsx`) — decidir 1 formato primeiro.
5. **Import por OCR** (PDF/foto) — maior custo (Tesseract), fazer por último do lote.

**Futuro (fora do MVP, backlog):** análise nutricional, cardápios semanais (ver CLAUDE.md).

---

## 4. P2 — Saúde do projeto (contínuo)

- [ ] **E2E Playwright** cobrindo o fluxo real por *clique*: lista → detalhe → editar → excluir → buscar (o bug da tela em branco só aparecia clicando, não via URL direta — o E2E precisa clicar).
- [ ] Revisar `Button.vue`: warnings `Property "variant"/"size" was accessed during render but is not defined` (cosmético, mas polui o console) — declarar as props corretamente.
- [ ] Confirmar `CACHE_STORE`/`QUEUE_CONNECTION`/`SESSION_DRIVER` batendo com Redis em todos os `.env*` e `docker-compose.yml`.
- [ ] Manter cobertura ≥80% e o Quality Gate verde em todo PR.

---

## 5. Convenções para o CLI seguir (não negociar)

- **Backend:** lógica em `Services/`, validação em `FormRequest`, respostas consistentes (`{ data: ... }`), owner-only via Policy, soft deletes. PHPStan **level 8** + **Pint** limpos.
- **Frontend:** Vue 3 Composition API, **TS strict**, Pinia para estado, composables para lógica reutilizável. **Normalizar toda resposta da API na camada `api/`** (nunca confiar que arrays não vêm `null`).
- **Testes:** Pest (backend) e Vitest (frontend), cobertura **≥80%**. E2E Playwright para fluxos críticos.
- **Segurança:** manter os 10 controles do `OWASP_CHECKLIST.md` (JWT 1h, throttle, SSRF whitelist, sem segredos no código).
- **Git:** 1 PR pequeno e focado por feature; nunca `main` direto; deixar o **Quality Gate** passar antes de pedir review.
- **Fluxo recomendado no CLI:** para escopo, use `/to-prd` → `/to-design` → `/to-issues`; para implementar, `/tdd`; para revisar, o skill `recipbot-code-reviewer` ou `/code-review`.

---

## 6. Sugestão de primeira sessão no CLI

```
1) Corrija o atraso de 5s ao criar receita (seção 2.1) e abra o PR.
2) Faça a triagem das branches da seção 2.2: liste o que cada uma entrega,
   recomende manter/descartar, e delete as obsoletas.
3) Comece o roadmap pela feature "structured-list-editor" re-implementada
   a partir do main atual (seção 2.2 + 3), com testes e Quality Gate verde.
```
