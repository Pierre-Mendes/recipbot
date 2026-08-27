<?php

namespace App\Services;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RecipeService
{
    /**
     * Create a new recipe owned by the given user.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): Recipe
    {
        return $user->recipes()->create([
            'title' => $data['title'],
            'ingredients' => $data['ingredients'],
            'tags' => $data['tags'] ?? [],
            'source_url' => $data['source_url'] ?? null,
        ]);
    }

    /**
     * Update an existing recipe.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Recipe $recipe, array $data): Recipe
    {
        $recipe->update($data);

        return $recipe->fresh();
    }

    /**
     * Get a user's recipes, newest first, paginated.
     */
    public function getUserRecipes(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return $user->recipes()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
