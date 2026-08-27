# ⚡ Quick Start - 5 Minutos

## 🚀 Do Download ao Rodando

```bash
# 1. Descompacte a pasta (já deve estar feito)
cd recipbot-setup-final

# 2. Copie para seu projeto
cd /path/to/recipbot
cp -r /path/to/recipbot-setup-final/* .

# 3. Executar setup automático
chmod +x setup.sh
./setup.sh

# Output esperado:
# ✅ Backend structure criada
# ✅ Frontend structure criada
# ✅ .env criado
# ✅ Pronto para docker-compose!

# 4. Iniciar Docker
docker-compose up --build

# Esperar por:
# ✅ postgres | database system is ready to accept connections
# ✅ app | server started on 0.0.0.0:8000
# ✅ frontend | VITE ... running at: http://localhost:5173

# 5. Acessar (em outro terminal)
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Database: http://localhost:8080
```

**Tempo**: 5 minutos ⏱️

---

## 🎯 Verificar se Está Funcionando

```bash
# Em novo terminal enquanto docker roda:

# Backend?
curl http://localhost:8000

# Frontend?
curl http://localhost:5173

# Database?
psql -h localhost -U postgres -d recipbot
  \dt  # listar tabelas
  \q   # sair

# Tudo OK? ✅ Pronto para próximos passos!
```

---

## 📚 Próximos Passos

1. Leia **CLAUDE.md** (5 min)
2. Leia **constitution.md** (5 min)
3. Leia **HARNESS-GUIDE.md** (10 min)
4. Veja **CLAUDE_PROMPT_START.md**
5. Dispare primeiro prompt para Claude Code

---

## ✅ Checklist

- [ ] Pasta descompactada
- [ ] `cp -r * .` executado no projeto
- [ ] `chmod +x setup.sh && ./setup.sh` OK
- [ ] `docker-compose up --build` rodando
- [ ] http://localhost:5173 acessível ✅
- [ ] Pronto para ler CLAUDE.md

**Pronto? 🚀**
