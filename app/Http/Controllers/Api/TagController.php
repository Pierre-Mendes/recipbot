<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\RecipeSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TagController
{
    public function __construct(
        private readonly RecipeSearchService $search,
    ) {}

    /**
     * Tag autocomplete suggestions for the authenticated user, per
     * specs/recipe-search.spec.md's GET /api/tags contract.
     */
    public function suggestions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tags = $this->search->suggestTags($user, (string) $request->query('q', ''));

        return response()->json(['tags' => $tags]);
    }
}
