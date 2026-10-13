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
            // Object key of the uploaded photo on the recipe images disk
            // (MinIO/S3 in docker). Null when the recipe has no photo.
            $table->string('image_path', 255)->nullable()->after('notes');
            // Key of a built-in cover illustration (App\Enums\RecipeCover),
            // shown when there is no photo.
            $table->string('cover', 32)->nullable()->after('image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'cover']);
        });
    }
};
