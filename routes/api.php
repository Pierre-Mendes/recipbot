<?php

use App\Http\Controllers\Api\RecipeController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->group(function () {
    Route::apiResource('recipes', RecipeController::class);
});
