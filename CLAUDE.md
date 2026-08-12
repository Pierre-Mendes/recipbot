# CLAUDE.md - Guide for Claude Code CLI (RecipBot)

## Project Overview
RecipBot is a free, intelligent recipe management assistant built over Telegram. It allows users to save recipes from text, screenshots (OCR), and links; edit extracted data; tag recipes automatically; link original URLs (Instagram, YouTube, websites); and retrieve recipes using hybrid search (Keyword/Tags + RAG vector search).

## Tech Stack
- **Language/Framework:** Node.js, TypeScript, NestJS
- **Bot Platform:** Telegram (`telegraf` or `@grammyjs/nestjs`)
- **Database:** PostgreSQL + `pgvector` extension (Docker Container / Supabase)
- **AI/RAG:** LangChain, Google Gemini API (Free Tier for Vision/Embeddings/LLM)
- **OCR:** Tesseract.js (local fallback) / Gemini Vision
- **Testing:** Jest (Unit & Integration), Supertest (E2E)
- **Containerization:** Docker & Docker Compose

## Command Cheat Sheet
- **Build App:** `npm run build`
- **Development (Local):** `npm run start:dev`
- **Docker Dev Environment:** `docker compose up --build`
- **Linting:** `npm run lint`
- **Formatting:** `npm run format`
- **Unit Tests:** `npm run test`
- **Integration Tests:** `npm run test:integration`
- **E2E Tests:** `npm run test:e2e`

## Architecture & Security Principles
- **Clean Architecture & DDD:** Modular NestJS architecture (Handlers -> Use Cases -> Repositories -> DTOs).
- **OWASP Top 10 Security:**
  - Strict DTO validation with `class-validator`.
  - SSRF protection on URL scraping (block local/internal IP ranges).
  - Parameterized queries via ORM/QueryBuilder.
  - Secret header validation for Telegram webhooks.
- **Human-in-the-Loop:** Automated extractions MUST store a temporary draft (`recipe_drafts`) and request user confirmation.
- **Testing Standard:** Target >80% coverage on unit and integration tests.
