<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\RecipeScrapingException;
use App\Http\Requests\FromUrlRequest;
use App\Http\Requests\IndexRecipesRequest;
use App\Http\Requests\StoreRecipeRequest;
use App\Http\Requests\UpdateRecipeRequest;
use App\Http\Resources\RecipeResource;
use App\Models\Recipe;
use App\Models\User;
use App\Services\RecipeScraperService;
use App\Services\RecipeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class RecipeController extends ApiController
{
    public function __construct(
        private readonly RecipeService $recipes,
    ) {}

    /**
     * List the authenticated user's recipes (paginated).
     */
    public function index(IndexRecipesRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $perPage = (int) $request->input('per_page', config('recipbot.pagination.recipes_default_per_page', 20));
        $recipes = $this->recipes->getUserRecipes($user, $perPage);

        return $this->paginated($recipes, RecipeResource::collection($recipes));
    }

    /**
     * Create a new recipe (manual input).
     */
    public function store(StoreRecipeRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $recipe = $this->recipes->create($user, $request->validated());

        return $this->success(new RecipeResource($recipe), 'Recipe created successfully', status: 201);
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

        return $this->success(new RecipeResource($recipe), 'Recipe created successfully', status: 201);
    }

    /**
     * View a single recipe (owner-only).
     */
    public function show(Recipe $recipe): JsonResponse
    {
        Gate::authorize('view', $recipe);

        return $this->success(new RecipeResource($recipe));
    }

    /**
     * Update a recipe (owner-only).
     */
    public function update(UpdateRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        Gate::authorize('update', $recipe);

        $recipe = $this->recipes->update($recipe, $request->validated());

        return $this->success(new RecipeResource($recipe), 'Recipe updated successfully');
    }

    /**
     * Delete a recipe (soft delete, owner-only).
     */
    public function destroy(Recipe $recipe): JsonResponse
    {
        Gate::authorize('delete', $recipe);

        $this->recipes->delete($recipe);

        return $this->success(null, 'Recipe deleted successfully');
    }
}
