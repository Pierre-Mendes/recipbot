<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The dominant access pattern is "this user's recipes, newest first"
     * (RecipeService::getUserRecipes() and RecipeSearchService both scope every
     * query to user_id and order by created_at desc). Postgres does NOT create
     * an index for a foreign-key column automatically, so without this those
     * queries fall back to a sequential scan as a user's recipe count grows.
     *
     * A composite (user_id, created_at) index serves both the equality filter
     * and the ordering in one, which the standalone created_at index (from the
     * create_recipes migration) cannot do for a per-user query.
     */
    public function up(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
        });
    }
};
