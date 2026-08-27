<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecipeSearchControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_searches_by_single_tag(): void
    {
        Recipe::factory()->count(3)->for($this->user)->create(['tags' => ['sobremesa']]);
        Recipe::factory()->count(2)->for($this->user)->create(['tags' => ['salgado']]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);

        $response->assertStatus(200);
        $this->assertSame(3, $response->json('pagination.total'));
    }

    public function test_searches_by_multiple_tags_requires_all(): void
    {
        Recipe::factory()->for($this->user)->create(['tags' => ['sobremesa', 'chocolate']]);
        Recipe::factory()->for($this->user)->create(['tags' => ['sobremesa']]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa', 'chocolate']]);

        $response->assertStatus(200);
        $this->assertSame(1, $response->json('pagination.total'));
    }

    public function test_full_text_search_matches_title_and_ingredients(): void
    {
        Recipe::factory()->for($this->user)->create([
            'title' => 'Bolo de Chocolate',
            'ingredients' => ['farinha', 'açúcar'],
        ]);
        Recipe::factory()->for($this->user)->create([
            'title' => 'Salada Verde',
            'ingredients' => ['alface', 'chocolate em pó'],
        ]);
        Recipe::factory()->for($this->user)->create([
            'title' => 'Torta de Limão',
            'ingredients' => ['limão', 'leite condensado'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['query' => 'chocolate']);

        $response->assertStatus(200);
        $this->assertSame(2, $response->json('pagination.total'));
    }

    public function test_combines_tag_and_query_filters(): void
    {
        Recipe::factory()->for($this->user)->create([
            'title' => 'Bolo de Chocolate',
            'tags' => ['sobremesa'],
        ]);
        Recipe::factory()->for($this->user)->create([
            'title' => 'Torta de Chocolate',
            'tags' => ['salgado'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa'], 'query' => 'chocolate']);

        $response->assertStatus(200);
        $this->assertSame(1, $response->json('pagination.total'));
    }

    public function test_returns_empty_data_for_no_matches_without_erroring(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['nao_existe']]);

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
        $this->assertSame(0, $response->json('pagination.total'));
    }

    public function test_only_searches_the_authenticated_users_recipes(): void
    {
        $other = User::factory()->create();
        Recipe::factory()->for($other)->create(['tags' => ['sobremesa']]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);

        $response->assertStatus(200);
        $this->assertSame(0, $response->json('pagination.total'));
    }

    public function test_results_are_paginated(): void
    {
        Recipe::factory()->count(25)->for($this->user)->create(['tags' => ['sobremesa']]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa'], 'per_page' => 20]);

        $response->assertStatus(200);
        $this->assertSame(25, $response->json('pagination.total'));
        $this->assertSame(2, $response->json('pagination.last_page'));
        $this->assertCount(20, $response->json('data'));
    }

    public function test_second_identical_search_is_served_from_cache(): void
    {
        Recipe::factory()->count(2)->for($this->user)->create(['tags' => ['sobremesa']]);

        $first = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);
        $second = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);

        $first->assertStatus(200);
        $second->assertStatus(200);
        $this->assertFalse($first->json('meta.cache_hit'));
        $this->assertTrue($second->json('meta.cache_hit'));
    }

    public function test_creating_a_recipe_invalidates_the_search_cache(): void
    {
        Recipe::factory()->for($this->user)->create(['tags' => ['sobremesa']]);

        $before = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);
        $this->assertSame(1, $before->json('pagination.total'));

        // Goes through RecipeController::store() -> RecipeService::create(),
        // which is what actually triggers invalidation - a factory-created
        // recipe would bypass that path and prove nothing here.
        $this->actingAs($this->user, 'api')->postJson('/api/recipes', [
            'title' => 'Segunda Sobremesa',
            'ingredients' => ['acucar'],
            'tags' => ['sobremesa'],
        ])->assertStatus(201);

        $after = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);

        $after->assertStatus(200);
        $this->assertSame(2, $after->json('pagination.total'));
        $this->assertFalse($after->json('meta.cache_hit'));
    }

    public function test_unauthenticated_cannot_search(): void
    {
        $response = $this->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);

        $response->assertStatus(401);
    }
}
