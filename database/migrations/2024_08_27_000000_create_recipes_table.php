<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recipes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 255);
            $table->jsonb('ingredients')->default('[]');
            $table->jsonb('tags')->default('[]');
            $table->string('source_url', 2048)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('created_at');
        });

        DB::statement('CREATE INDEX idx_recipes_tags ON recipes USING GIN (tags)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
