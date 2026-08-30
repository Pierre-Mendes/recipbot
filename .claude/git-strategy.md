# 🌳 Git Strategy - Micro-Commits & Micro-PRs

## Estratégia de Commits

### Tamanho Máximo por Commit
- **Max 400 linhas de mudança** (código + testes)
- **Max 1 feature por commit**
- **1 commit = 1 razão de existência**

### Padrão de Commit Message
```
type(scope): description

body (optional, max 72 chars per line)

footer (optional, breaking changes, closes #123)
```

### Tipos de Commit
- `feat:` Nova feature
- `fix:` Bug fix
- `test:` Apenas testes
- `refactor:` Sem mudar comportamento
- `docs:` Documentação
- `chore:` Setup, dependências
- `perf:` Performance improvement

### Exemplos

```bash
# ✅ BOM - Micro-commit focado
git commit -m "feat(recipes): add Recipe model with validation

- Add Recipe Eloquent model
- Add soft deletes support
- Add fillable attributes
- Add casting for JSON fields

Closes #1"

# ✅ BOM - Testes separado
git commit -m "test(recipes): add Recipe model tests

- Test recipe creation
- Test validation rules
- Test soft delete behavior

Closes #2"

# ✅ BOM - Migration separada
git commit -m "chore(database): create recipes table

Migration: CreateRecipesTable
- Adds recipes table with proper indexes
- Adds foreign key to users
- Adds soft deletes

Closes #3"

# ❌ RUIM - Muito grande
git commit -m "implement recipe feature"
# (contém model + migration + controller + tests + frontend)
```

---

## Branching Strategy

### Branch per Feature
```bash
# Criar branch por feature
git checkout -b feat/recipe-management

# Ou por bug
git checkout -b fix/ssrf-protection

# Ou por task
git checkout -b chore/setup-authentication
```

### Workflow
```
main (always stable)
  ↑
  └─ feat/recipe-management
      ├─ commit 1: recipe model
      ├─ commit 2: recipe tests
      ├─ commit 3: api controller
      ├─ commit 4: api tests
      ├─ commit 5: frontend component
      └─ commit 6: frontend tests
      
  PR #1: Add Recipe Management (6 commits)
  ↓ (review → merge)
  
  └─ feat/recipe-search
      ├─ commit 1: search service
      ├─ commit 2: search tests
      ├─ commit 3: search index
      └─ commit 4: frontend search
      
  PR #2: Add Recipe Search (4 commits)
```

---

## Micro-PR Strategy

### Uma Feature = Uma PR (mas com múltiplos commits!)

**NÃO faça:**
- 1 commit gigante com tudo
- 1 PR por commit

**FAÇA:**
- 1 PR = 1 feature completa
- Cada commit dentro da PR = 1 responsabilidade
- 4-8 commits por PR (não 1, não 20)

### Template de PR
```markdown
## Description
Implements Recipe Management feature - allows users to create, read, update, delete recipes

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change

## Checklist
- [x] Tests added (>80% coverage)
- [x] Documentation updated
- [x] Security reviewed (OWASP)
- [x] Performance tested
- [x] Code reviewed

## Test Plan
1. Create recipe via API
2. Verify in database
3. Fetch recipe and validate
4. Update recipe
5. Delete recipe (soft)

## Commits in this PR
- `feat(recipes): add Recipe model`
- `test(recipes): add model tests`
- `feat(api): add recipe controller`
- `test(api): add controller tests`
- `feat(frontend): add recipe form`
- `test(frontend): add form tests`
```

---

## Automação com Claude Code

### Prompt para Claude Code
```
Ao implementar features:

1. Use branch naming: feat/feature-name
2. Commit em micro-commits (<400 linhas):
   - Cada modelo/migração = 1 commit
   - Cada serviço/controller = 1 commit
   - Cada teste = 1 commit
   - Cada componente Vue = 1 commit
3. Commit message format: type(scope): description
4. Create PR automaticamente quando feature completa
5. PR title = feature name
6. PR description = acceptance criteria + test plan

Example workflow:
  $ git checkout -b feat/recipe-management
  $ git commit -m "feat(recipes): add Recipe model"
  $ git commit -m "test(recipes): add model tests"
  $ git commit -m "feat(api): add recipe controller"
  $ git commit -m "test(api): add controller tests"
  $ git commit -m "feat(frontend): add recipe form"
  $ git commit -m "test(frontend): add form tests"
  $ gh pr create --title "Add Recipe Management" --body "..."
```

---

## GitHub Integration

### Configurar Token (uma vez)
```bash
# Gerar token em https://github.com/settings/tokens
# Scopes: repo, workflows

gh auth login
# Escolha: GitHub.com
# Escolha: HTTPS
# Autentique com token
```

### Criar PR Automaticamente
```bash
# Claude Code pode executar:
gh pr create \
  --title "Add Recipe Management" \
  --body "Implements recipe CRUD operations" \
  --base main \
  --head feat/recipe-management
```

### Listar PRs
```bash
gh pr list
# Mostra status, commits, reviews
```

---

## Workflow Completo (Exemplo)

### Week 1: Recipe Management Feature

```bash
# 1. Criar branch
git checkout -b feat/recipe-management

# 2. Claude Code faz commits pequenos
git commit -m "feat(recipes): add Recipe model with validation"
git commit -m "test(recipes): add Recipe model tests"
git commit -m "chore(database): create recipes migration"
git commit -m "feat(api): add RecipeController endpoints"
git commit -m "test(api): add RecipeController tests"
git commit -m "feat(frontend): add RecipeForm component"
git commit -m "test(frontend): add RecipeForm tests"

# 3. Criar PR automaticamente
gh pr create \
  --title "feat: Add Recipe Management" \
  --body "
Implements US01+US02: Recipe CRUD with manual input and URL scraping

## Changes
- Recipe Eloquent model with validation
- Database migration with proper indexes
- RecipeController with 5 endpoints
- RecipeForm Vue component
- 50+ tests (>80% coverage)

## Test Plan
- Create recipe manually
- Create recipe from URL
- Fetch recipes (with pagination)
- Update recipe
- Delete recipe (soft delete)

Closes #1"

# 4. Seu review no GitHub
# - Vê 7 commits bem organizados
# - Cada commit é pequeno e legível
# - Fácil revisar linha por linha

# 5. Merge quando aprovado
gh pr merge --squash  # Opcional: squeeze para 1 commit
# Ou merge sem squeeze para manter histórico
```

---

## Monitoramento

### Ver histórico de commits
```bash
git log --oneline

# Output:
# a1b2c3d feat(recipes): add Recipe model
# b2c3d4e test(recipes): add Recipe model tests
# c3d4e5f chore(database): create recipes migration
# d4e5f6g feat(api): add RecipeController
# e5f6g7h test(api): add RecipeController tests
```

### Ver commits em uma PR
```bash
gh pr view 1 --json commits --jq '.commits[].oid' | head -10
```

---

## Configuração .gitconfig (Opcional)

```bash
# Salvar em ~/.gitconfig para todos os repos
git config --global user.name "Pierre Mendes"
git config --global user.email "pierretielmendes@gmail.com"

# Ou por repo (recomendado para múltiplos projetos)
cd ~/Projects/recipbot
git config user.name "Pierre Mendes"
git config user.email "pierretielmendes@gmail.com"
```

---

## Resumo da Estratégia

✅ **Cada commit:**
- < 400 linhas de mudança
- 1 responsabilidade
- Message clara (type + scope + description)

✅ **Cada PR:**
- 1 feature completa
- 4-8 commits bem organizados
- Descrição clara com test plan
- Fácil revisar

✅ **GitHub:**
- Token configurado
- PRs criadas automaticamente
- Merge after review

---

**Pronto para implementação!**

Claude Code seguirá essa estratégia automaticamente se você avisar no prompt inicial.
