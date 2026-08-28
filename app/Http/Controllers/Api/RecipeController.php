<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\RecipeScrapingException;
use App\Http\Requests\FromUrlRequest;
use App\Http\Requests\StoreRecipeRequest;
use App\Http\Requests\UpdateRecipeRequest;
use App\Models\Recipe;
use App\Models\User;
use App\Services\RecipeScraperService;
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
        /** @var User $user */
        $user = $request->user();

        $recipes = $this->recipes->getUserRecipes($user);

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
        /** @var User $user */
        $user = $request->user();

        $recipe = $this->recipes->create($user, $request->validated());

        return response()->json([
            'data' => $recipe,
            'message' => 'Recipe created successfully',
        ], 201);
    }

    /**
     * Create a new recipe by scraping it from a whitelisted URL.
     */
    public function fromUrl(FromUrlRequest $request, RecipeScraperService $scraper): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $extracted = $scraper->extract($request->validated('url'));
        } catch (RecipeScrapingException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $recipe = $this->recipes->create($user, [
            'title' => $extracted['title'],
            'ingredients' => $extracted['ingredients'],
            'instructions' => $extracted['instructions'],
            'tags' => $request->validated('tags') ?? [],
            'source_url' => $request->validated('url'),
        ]);

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

        $this->recipes->delete($recipe);

        return response()->json(['message' => 'Recipe deleted successfully']);
    }
}
