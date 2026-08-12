# System Design - RecipBot

## 1. Executive Summary
RecipBot is a Telegram assistant for saving, editing, organizing, and querying recipes using AI (LLMs, OCR, Embeddings).

## 2. Architecture & Docker Integration
Applications run in Docker. PostgreSQL uses the official `pgvector/pgvector:pg16` image with initial DDL execution from `./docs/database-schema.sql`.
