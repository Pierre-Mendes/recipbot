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
- **Runtime**: PHP 8.4 (Alpine Linux)
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
