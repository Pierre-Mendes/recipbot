<?php

namespace App\Services;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RecipeService
{
    public function __construct(
        private readonly RecipeSearchService $search,
    ) {}

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

        $this->search->invalidate($user);

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

        $this->search->invalidate($this->ownerOf($recipe));

        return $recipe;
    }

    /**
     * Soft-delete a recipe.
     */
    public function delete(Recipe $recipe): void
    {
        $user = $this->ownerOf($recipe);
        $recipe->delete();
        $this->search->invalidate($user);
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
