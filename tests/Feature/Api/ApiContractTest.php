<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_recipe_index_uses_standard_envelope(): void
    {
        $user = User::factory()->create();
        Recipe::factory()->for($user)->create();

        $response = $this->actingAs($user, 'api')->getJson('/api/recipes');

        $response->assertStatus(200)->assertJsonStructure([
            'data',
            'meta' => ['pagination' => ['current_page', 'total', 'per_page', 'last_page']],
        ]);
    }

    public function test_search_uses_standard_envelope_with_pagination_metadata(): void
    {
        $user = User::factory()->create();
        Recipe::factory()->for($user)->create(['tags' => ['sobremesa']]);

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/recipes/search', ['tags' => ['sobremesa']]);

        $response->assertStatus(200)->assertJsonStructure([
            'data',
            'meta' => ['pagination' => ['current_page', 'total', 'per_page', 'last_page'], 'search_time_ms', 'cache_hit'],
        ]);
    }

    public function test_tag_suggestions_uses_data_key(): void
    {
        $user = User::factory()->create();
        Recipe::factory()->for($user)->create(['tags' => ['sobremesa']]);

        $response = $this->actingAs($user, 'api')->getJson('/api/tags');

        $response->assertStatus(200)->assertJsonStructure([
            'data' => [['name', 'count']],
        ]);
    }
}
