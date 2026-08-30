<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\TagSuggestionsRequest;
use App\Models\User;
use App\Services\RecipeSearchService;
use Illuminate\Http\JsonResponse;

class TagController extends ApiController
{
    public function __construct(
        private readonly RecipeSearchService $search,
    ) {}

    /**
     * Tag autocomplete suggestions for the authenticated user, per
     * specs/recipe-search.spec.md's GET /api/tags contract.
     */
    public function suggestions(TagSuggestionsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tags = $this->search->suggestTags(
            $user,
            (string) $request->query('q', ''),
            (int) $request->query('limit', config('recipbot.pagination.tags_default_limit', 10)),
        );

        return $this->success($tags);
    }
}
