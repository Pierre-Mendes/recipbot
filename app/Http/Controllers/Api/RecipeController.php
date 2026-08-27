<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreRecipeRequest;
use App\Http\Requests\UpdateRecipeRequest;
use App\Models\Recipe;
use App\Services\RecipeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RecipeController
{
    public function __construct(
        private readonly RecipeService $recipes,
    ) {}

    /**
     * List the authenticated user's recipes (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $recipes = $this->recipes->getUserRecipes($request->user());

        return response()->json([
            'data' => $recipes->items(),
            'meta' => [
                'current_page' => $recipes->currentPage(),
                'total' => $recipes->total(),
                'per_page' => $recipes->perPage(),
                'last_page' => $recipes->lastPage(),
            ],
        ]);
    }

    /**
     * Create a new recipe (manual input).
     */
    public function store(StoreRecipeRequest $request): JsonResponse
    {
        $recipe = $this->recipes->create($request->user(), $request->validated());

        return response()->json([
            'data' => $recipe,
            'message' => 'Recipe created successfully',
        ], 201);
    }

    /**
     * View a single recipe (owner-only).
     */
    public function show(Recipe $recipe): JsonResponse
    {
        Gate::authorize('view', $recipe);

        return response()->json(['data' => $recipe]);
    }

    /**
     * Update a recipe (owner-only).
     */
    public function update(UpdateRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        Gate::authorize('update', $recipe);

        $recipe = $this->recipes->update($recipe, $request->validated());

        return response()->json([
            'data' => $recipe,
            'message' => 'Recipe updated successfully',
        ]);
    }

    /**
     * Delete a recipe (soft delete, owner-only).
     */
    public function destroy(Recipe $recipe): JsonResponse
    {
        Gate::authorize('delete', $recipe);

        $recipe->delete();

        return response()->json(['message' => 'Recipe deleted successfully']);
    }
}
