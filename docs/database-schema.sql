CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS recipe_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    title VARCHAR(255),
    ingredients TEXT[] DEFAULT '{}',
    instructions TEXT[] DEFAULT '{}',
    tags VARCHAR(50)[] DEFAULT '{}',
    source_url TEXT,
    raw_extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    ingredients TEXT[] NOT NULL DEFAULT '{}',
    instructions TEXT[] NOT NULL DEFAULT '{}',
    tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
    source_url TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_chat_id ON recipes(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_recipe_drafts_chat_id ON recipe_drafts(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_recipes_embedding ON recipes USING hnsw (embedding vector_cosine_ops);
