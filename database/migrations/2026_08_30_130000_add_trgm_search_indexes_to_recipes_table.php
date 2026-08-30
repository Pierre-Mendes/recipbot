<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * RecipeSearchService's free-text search uses leading-wildcard ILIKE on
     * `title` and on `ingredients::text`. A btree index cannot serve a
     * `%term%` pattern, so those scans are sequential. pg_trgm GIN indexes
     * make ILIKE (with wildcards on both sides) index-backed.
     *
     * The ingredients index is an expression index on `ingredients::text` -
     * it must match the exact expression the query casts (`ingredients::text`)
     * for the planner to use it.
     */
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX idx_recipes_title_trgm ON recipes USING GIN (title gin_trgm_ops)');
        DB::statement('CREATE INDEX idx_recipes_ingredients_trgm ON recipes USING GIN ((ingredients::text) gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_recipes_ingredients_trgm');
        DB::statement('DROP INDEX IF EXISTS idx_recipes_title_trgm');
        // The pg_trgm extension is intentionally left installed: other objects
        // may depend on it, and dropping a shared extension in a down-migration
        // is riskier than the harmless cost of leaving it enabled.
    }
};
