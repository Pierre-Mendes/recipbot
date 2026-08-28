<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            // NOT NULL with a default, matching the sibling ingredients/tags
            // jsonb columns - keeps `instructions` always a safely-iterable
            // array for API consumers instead of null on pre-existing rows.
            $table->jsonb('instructions')->default('[]')->after('ingredients');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropColumn('instructions');
        });
    }
};
