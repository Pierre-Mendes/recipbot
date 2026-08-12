# Claude Code Harness Guide

## Step 1: Initialize Git, Docker & Repository
```bash
claude "Read CLAUDE.md, docker-compose.yml, and Dockerfile. Execute git init, configure .gitignore, create package.json with NestJS, Telegraf/Grammy, LangChain, @google/generative-ai, and pg. Create an initial commit and run (gh repo create recipbot --public --source=. --remote=origin) to push to GitHub."
```

## Step 2: Database Layer & DTO Specifications
```bash
claude "Read docs/database-schema.sql, docs/business-rules.md, and CLAUDE.md. Create NestJS database module for PostgreSQL + pgvector. Implement class-validator DTOs with OWASP input sanitization."
```

## Step 3: OCR & Scraping Modules
```bash
claude "Read docs/user-stories.md (US01 & US02) and docs/workflows.md. Implement `src/modules/ocr` using Gemini Vision API and `src/modules/scraping` using cheerio with SSRF protection. Include unit tests."
```

## Step 4: RAG & LangChain Module
```bash
claude "Read docs/user-stories.md (US04) and docs/workflows.md. Implement `src/modules/rag` using LangChain and Gemini Embeddings for hybrid search (GIN tag index + pgvector cosine similarity). Include unit and integration tests."
```

## Step 5: Telegram Bot Module & Human-In-The-Loop Handler
```bash
claude "Read docs/user-stories.md (US03), docs/workflows.md, and docs/business-rules.md. Implement `src/modules/bot` with Inline Keyboards for preview, link editing, and text adjustments."
```

## Step 6: Testing & Docker Verification
```bash
claude "Read CLAUDE.md and business-rules.md. Add unit tests (>80% coverage), integration tests, and ensure `docker compose up --build` boots up clean."
```
