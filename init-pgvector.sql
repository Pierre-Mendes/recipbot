-- Enable pgvector extension on startup
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Enable JSON operations
CREATE EXTENSION IF NOT EXISTS plpgsql;

-- Optional: Create custom functions for JSONB operations (Phase 2)
-- These will be useful for advanced search capabilities later
