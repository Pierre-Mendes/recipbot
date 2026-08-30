<?php

namespace App\Services;

use App\Events\RecipeCreated;
use App\Events\RecipeDeleted;
use App\Events\RecipeUpdated;
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
        $recipe = $user->recipes()->create([
            'title' => $data['title'],
            'ingredients' => $data['ingredients'],
            'instructions' => $data['instructions'] ?? [],
            'tags' => $data['tags'] ?? [],
            'source_url' => $data['source_url'] ?? null,
        ]);

        event(new RecipeCreated($recipe, $user));

        return $recipe;
    }

    /**
     * Update an existing recipe.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Recipe $recipe, array $data): Recipe
    {
        $recipe->update($data);
        $recipe->refresh();

        event(new RecipeUpdated($recipe, $this->ownerOf($recipe)));

        return $recipe;
    }

    /**
     * Soft-delete a recipe.
     */
    public function delete(Recipe $recipe): void
    {
        $user = $this->ownerOf($recipe);
        $recipe->delete();
        event(new RecipeDeleted($recipe, $user));
    }

    /**
     * A recipe's user_id is a required, DB-enforced foreign key, so the
     * relation is never actually null - this just satisfies static analysis.
     */
    private function ownerOf(Recipe $recipe): User
    {
        /** @var User $user */
        $user = $recipe->user;

        return $user;
    }

    /**
     * Get a user's recipes, newest first, paginated.
     *
     * @return LengthAwarePaginator<int, Recipe>
     */
    public function getUserRecipes(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return $user->recipes()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
