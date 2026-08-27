# 🚀 RecipBot MVP - Instruções de Setup Final

## 📁 O Que Tem Nesta Pasta

```
recipbot-setup-final/
├── README.md                         (índice - COMECE AQUI)
├── QUICK_START.md                    (5 minutos)
├── SETUP_INSTRUCTIONS.md             (este arquivo)
├── setup.sh                          (script automático)
├── OWASP_CHECKLIST.md                (segurança)
├── CLAUDE_PROMPT_START.md            (prompts prontos)
│
├── CLAUDE.md                         (overview)
├── constitution.md                   (princípios)
├── HARNESS-GUIDE.md                  (como trabalhar)
│
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── .harness/                         (pipelines)
│   └── features/
├── specs/                            (especificações)
├── docs/                             (documentação)
├── .claude/                          (Claude Code config)
└── .github/                          (CI/CD workflows)
```

---

## ⚡ Setup em 5 Passos

### Passo 1: Copiar Arquivos

```bash
# Você já tem recipbot clonad em /path/to/recipbot
# Esta pasta "recipbot-setup-final" tem todos os arquivos

# Opção A: Copiar com comando (recomendado)
cd /path/to/recipbot
cp -r /path/to/recipbot-setup-final/* .
cp -r /path/to/recipbot-setup-final/.* .  # Copiar arquivos escondidos

# Opção B: Copiar manualmente
# 1. Copie QUICK_START.md para ./
# 2. Copie CLAUDE.md para ./
# 3. Copie constitution.md para ./
# ... e assim por diante
```

### Passo 2: Executar Setup Script

```bash
# Ir para diretório do projeto
cd recipbot

# Dar permissão de execução
chmod +x setup.sh

# Executar (remove arquivos antigos, cria estrutura)
./setup.sh

# Output esperado:
# ✅ Limpeza completa
# ✅ Backend structure criada
# ✅ Frontend structure criada
# ✅ Docs structure criada
# ✅ Harness structure criada
# ✅ Specs structure criada
# ✅ Claude e GitHub workflows criada
# ✅ .env criado
# ✅ .gitignore configurado
# ✅ SETUP COMPLETO!
```

### Passo 3: Copiar Arquivos de Código

Os arquivos de backend/, frontend/, .harness/, specs/, docs/ ainda precisam ser criados. Não se preocupe, o Claude Code vai criar tudo!

Por enquanto, apenas certifique-se que estas pastas existem (criadas pelo setup.sh):

```bash
# Verificar
ls -la backend/        # deve existir (vazio é OK)
ls -la frontend/       # deve existir (vazio é OK)
ls -la specs/          # deve existir (vazio é OK)
ls -la .harness/       # deve existir (vazio é OK)
ls -la docs/           # deve existir (vazio é OK)
```

### Passo 4: Configurar Ambiente

```bash
# Verificar se .env existe
cat .env

# Se não existir, copiar de exemplo:
cp .env.example .env

# Para MVP (desenvolvimento local), os valores padrão são OK:
# - DB_HOST=postgres
# - DB_PASSWORD=postgres
# - REDIS_HOST=redis
# - Sem APIs (Gemini, etc)
```

### Passo 5: Iniciar Docker

```bash
# Seu repo deve ter este arquivo (enviado antes)
ls -la docker-compose.yml

# Iniciar
docker-compose up --build

# Primeira vez pode levar 3-5 minutos

# Esperar por:
# ✅ postgres | database system is ready to accept connections
# ✅ app | Laravel server started on 0.0.0.0:8000
# ✅ frontend | VITE ... running at: http://localhost:5173

# Ctrl+C para parar (dados persistem)
```

---

## 🎯 Acessar Aplicação

Após setup, em novo terminal:

```bash
# Frontend
curl http://localhost:5173
# ou abra no navegador: http://localhost:5173

# Backend API
curl http://localhost:8000
# ou: http://localhost:8000

# Database Admin (opcional)
# URL: http://localhost:8080
# User: postgres
# Password: postgres
# Database: recipbot
```

---

## 📚 Arquivos Importantes (Ordem de Leitura)

### Imediato (depois do setup)
1. **QUICK_START.md** - 5 minutos verificação
2. **CLAUDE.md** - Overview do projeto

### Antes de começar código
3. **constitution.md** - Princípios de design
4. **HARNESS-GUIDE.md** - Como trabalhar com Claude Code

### Para implementação
5. **CLAUDE_PROMPT_START.md** - Prompts prontos
6. **OWASP_CHECKLIST.md** - Segurança validada

### Referência
7. **specs/** - Especificações por feature
8. **docs/** - Documentação técnica
9. **.harness/** - Pipelines declarativos

---

## ✅ Checklist Pós-Setup

```bash
# 1. Arquivos copiados?
ls -la CLAUDE.md constitution.md setup.sh

# 2. Setup script rodou?
cat .env | grep DB_HOST  # deve retornar "postgres"

# 3. Docker iniciando?
docker-compose ps  # deve listar 6 serviços

# 4. Acessível?
curl http://localhost:8000  # deve retornar HTML
curl http://localhost:5173  # deve retornar HTML

# 5. Pronto para Claude Code?
ls -la CLAUDE_PROMPT_START.md  # deve existir
```

---

## 🚀 Próxima Ação

Após confirmar setup OK:

```bash
# Leia rápido
cat QUICK_START.md

# Depois
cat CLAUDE.md
cat constitution.md
cat HARNESS-GUIDE.md

# Aí sim, dispare para Claude Code
cat CLAUDE_PROMPT_START.md | head -30  # Ver primeiro prompt

# E execute:
claude "Leia CLAUDE.md, constitution.md, HARNESS-GUIDE.md..."
```

---

## 🆘 Troubleshooting

### Docker não inicia
```bash
# Limpar tudo
docker-compose down -v

# Remover imagens antigas
docker image prune -a

# Tentar novamente
docker-compose up --build
```

### Porta em uso
```bash
# Se porta 5173 em uso
docker-compose -f docker-compose.yml up -p 5174:5173

# Se porta 8000 em uso
docker-compose -f docker-compose.yml up -p 8001:8000
```

### Arquivo não encontrado
```bash
# Verifique se está no diretório certo
pwd  # deve ser /path/to/recipbot

# Listar arquivos copiados
ls -la | grep -E "CLAUDE|setup.sh|docker-compose"

# Se faltarem, copie novamente da pasta
cp -r /path/to/recipbot-setup-final/* .
```

### Permissão negada
```bash
# Dar permissão de execução
chmod +x setup.sh
chmod +x scripts/  # se houver
```

---

## 📞 Status

Após estes passos:
- ✅ Projeto estruturado
- ✅ Docker rodando
- ✅ Pronto para Claude Code
- ✅ Segurança validada
- ✅ Documentação lida

---

**Versão**: 1.0  
**Data**: 2024-08-27  
**Tempo Estimado**: 15-20 minutos
