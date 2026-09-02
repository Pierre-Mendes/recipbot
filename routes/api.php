<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\RecipeSearchController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,15');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,15');

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:api')->group(function () {
    Route::post('recipes/search', RecipeSearchController::class);
    Route::post('recipes/from-url', [RecipeController::class, 'fromUrl']);
    Route::post('recipes/preview-url', [RecipeController::class, 'previewUrl']);
    Route::post('recipes/import-spreadsheet', [RecipeController::class, 'importSpreadsheet']);
    Route::post('recipes/import-file', [RecipeController::class, 'importFile']);
    Route::get('recipes/drafts/{draft}', [RecipeController::class, 'draft']);
    Route::get('recipes/{recipe}/export', [RecipeController::class, 'export']);
    Route::get('recipes/{recipe}/export-pdf', [RecipeController::class, 'exportPdf']);
    Route::apiResource('recipes', RecipeController::class);
    Route::get('tags', [TagController::class, 'suggestions']);
});
