<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_suggests_popular_tags_with_counts(): void
    {
        Recipe::factory()->count(3)->for($this->user)->create(['tags' => ['sobremesa', 'facil']]);
        Recipe::factory()->count(1)->for($this->user)->create(['tags' => ['sopa']]);

        $response = $this->actingAs($this->user, 'api')->getJson('/api/tags');

        $response->assertStatus(200);
        $tags = collect($response->json('data'))->keyBy('name');

        $this->assertSame(3, $tags['sobremesa']['count']);
        $this->assertSame(3, $tags['facil']['count']);
        $this->assertSame(1, $tags['sopa']['count']);
    }

    public function test_filters_suggestions_by_prefix(): void
    {
        Recipe::factory()->for($this->user)->create(['tags' => ['sobremesa']]);
        Recipe::factory()->for($this->user)->create(['tags' => ['sopa']]);
        Recipe::factory()->for($this->user)->create(['tags' => ['salgado']]);

        $response = $this->actingAs($this->user, 'api')->getJson('/api/tags?q=sob');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name')->all();

        $this->assertSame(['sobremesa'], $names);
    }

    public function test_only_suggests_the_authenticated_users_tags(): void
    {
        $other = User::factory()->create();
        Recipe::factory()->for($other)->create(['tags' => ['segredo']]);

        $response = $this->actingAs($this->user, 'api')->getJson('/api/tags');

        $response->assertStatus(200)->assertJsonCount(0, 'data');
    }

    public function test_unauthenticated_cannot_fetch_suggestions(): void
    {
        $response = $this->getJson('/api/tags');

        $response->assertStatus(401);
    }

    public function test_rejects_out_of_range_limit(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/tags?limit=999');

        $response->assertStatus(422)->assertJsonValidationErrors(['limit']);
    }
}
