<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecipeControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_list_user_recipes(): void
    {
        Recipe::factory()->count(5)->for($this->user)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/recipes');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'user_id', 'title', 'ingredients', 'instructions', 'tags', 'created_at'],
                ],
                'meta' => ['pagination' => ['current_page', 'total', 'per_page', 'last_page']],
            ])
            ->assertJsonCount(5, 'data');
    }

    public function test_list_only_returns_own_recipes(): void
    {
        $otherUser = User::factory()->create();
        Recipe::factory()->count(2)->for($this->user)->create();
        Recipe::factory()->count(3)->for($otherUser)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/recipes');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_create_recipe_with_valid_data(): void
    {
        $data = [
            'title' => 'Spaghetti Carbonara',
            'ingredients' => ['pasta', 'eggs', 'bacon', 'parmesan'],
            'tags' => ['italian', 'pasta'],
            'source_url' => null,
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', $data);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'title', 'ingredients'], 'message']);

        $this->assertDatabaseHas('recipes', [
            'user_id' => $this->user->id,
            'title' => 'Spaghetti Carbonara',
        ]);
    }

    public function test_can_create_recipe_with_a_note(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', [
                'title' => 'Bolo da vovó',
                'ingredients' => ['farinha', 'ovos'],
                'notes' => 'Receita do Instagram: https://instagram.com/p/abc',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.notes', 'Receita do Instagram: https://instagram.com/p/abc');

        $this->assertDatabaseHas('recipes', [
            'user_id' => $this->user->id,
            'title' => 'Bolo da vovó',
            'notes' => 'Receita do Instagram: https://instagram.com/p/abc',
        ]);
    }

    public function test_rejects_a_note_longer_than_2000_chars(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', [
                'title' => 'Bolo',
                'ingredients' => ['farinha'],
                'notes' => str_repeat('a', 2001),
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['notes']);
    }

    public function test_can_update_a_recipe_note(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create(['notes' => null]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/recipes/{$recipe->id}", ['notes' => 'Servir gelado']);

        $response->assertStatus(200)->assertJsonPath('data.notes', 'Servir gelado');
        $this->assertDatabaseHas('recipes', ['id' => $recipe->id, 'notes' => 'Servir gelado']);
    }

    public function test_can_create_recipe_with_instructions(): void
    {
        $data = [
            'title' => 'Spaghetti Carbonara',
            'ingredients' => ['pasta', 'eggs', 'bacon', 'parmesan'],
            'instructions' => ['Boil the pasta.', 'Mix eggs and cheese.', 'Combine everything.'],
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', $data);

        $response->assertStatus(201);
        $this->assertDatabaseHas('recipes', ['title' => 'Spaghetti Carbonara']);
        $this->assertSame(
            $data['instructions'],
            Recipe::where('title', 'Spaghetti Carbonara')->first()->instructions
        );
    }

    public function test_can_update_recipe_instructions(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create(['instructions' => []]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/recipes/{$recipe->id}", [
                'instructions' => ['Step one.', 'Step two.'],
            ]);

        $response->assertStatus(200);
        $this->assertSame(['Step one.', 'Step two.'], $recipe->refresh()->instructions);
    }

    public function test_cannot_create_recipe_without_ingredients(): void
    {
        $data = [
            'title' => 'Invalid Recipe',
            'ingredients' => [],
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['ingredients']);
    }

    public function test_rejects_null_tags_in_create_payload(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', [
                'title' => 'Test Recipe',
                'ingredients' => ['salt'],
                'tags' => null,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tags']);
    }

    public function test_title_validation_required(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', [
                'ingredients' => ['salt'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_ingredients_must_be_array(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes', [
                'title' => 'Test Recipe',
                'ingredients' => 'not an array',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['ingredients']);
    }

    public function test_can_view_own_recipe(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/recipes/{$recipe->id}");

        $response->assertStatus(200)
            ->assertJson(['data' => ['id' => $recipe->id, 'title' => $recipe->title]]);
    }

    public function test_cannot_view_others_recipe(): void
    {
        $otherUser = User::factory()->create();
        $recipe = Recipe::factory()->for($otherUser)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/recipes/{$recipe->id}");

        $response->assertStatus(403);
    }

    public function test_can_update_own_recipe(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create([
            'title' => 'Original Title',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/recipes/{$recipe->id}", [
                'title' => 'Updated Title',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('recipes', [
            'id' => $recipe->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_rejects_null_tags_in_update_payload(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/recipes/{$recipe->id}", [
                'tags' => null,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tags']);
    }

    public function test_cannot_update_others_recipe(): void
    {
        $otherUser = User::factory()->create();
        $recipe = Recipe::factory()->for($otherUser)->create();

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/recipes/{$recipe->id}", ['title' => 'Hacked Title']);

        $response->assertStatus(403);
    }

    public function test_can_soft_delete_own_recipe(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson("/api/recipes/{$recipe->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('recipes', ['id' => $recipe->id]);
    }

    public function test_cannot_delete_others_recipe(): void
    {
        $otherUser = User::factory()->create();
        $recipe = Recipe::factory()->for($otherUser)->create();

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson("/api/recipes/{$recipe->id}");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_cannot_access_endpoints(): void
    {
        $response = $this->getJson('/api/recipes');
        $response->assertStatus(401);
    }

    public function test_list_rejects_out_of_range_per_page(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/recipes?per_page=999');

        $response->assertStatus(422)->assertJsonValidationErrors(['per_page']);
    }
}
