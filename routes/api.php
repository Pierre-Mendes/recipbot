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
    Route::apiResource('recipes', RecipeController::class);
    Route::get('tags', [TagController::class, 'suggestions']);
});
