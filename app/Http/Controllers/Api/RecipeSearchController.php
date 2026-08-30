<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\SearchRecipesRequest;
use App\Http\Resources\RecipeResource;
use App\Models\User;
use App\Services\RecipeSearchService;
use Illuminate\Http\JsonResponse;

class RecipeSearchController extends ApiController
{
    public function __construct(
        private readonly RecipeSearchService $search,
    ) {}

    /**
     * Search the authenticated user's recipes by tags (AND logic) and/or a
     * free-text query, per specs/recipe-search.spec.md's API Contracts.
     */
    public function __invoke(SearchRecipesRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $start = microtime(true);

        $outcome = $this->search->search(
            $user,
            $request->input('tags', []),
            $request->input('query'),
            (int) $request->input('page', 1),
            (int) $request->input('per_page', config('recipbot.pagination.recipes_default_per_page', 20)),
        );

        $results = $outcome['results'];
        $searchTimeMs = (int) round((microtime(true) - $start) * 1000);

        return $this->paginated(
            $results,
            RecipeResource::collection($results),
            [
                'search_time_ms' => $searchTimeMs,
                'cache_hit' => $outcome['cache_hit'],
            ],
        );
    }
}
