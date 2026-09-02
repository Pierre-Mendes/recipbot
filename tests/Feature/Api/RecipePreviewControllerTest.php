<?php

namespace Tests\Feature\Api;

use App\Contracts\HostResolver;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Doubles\FakeHostResolver;
use Tests\TestCase;

class RecipePreviewControllerTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://tudogostoso.com.br/receita/1-bolo.html';

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->app->bind(HostResolver::class, fn () => new FakeHostResolver([
            'tudogostoso.com.br' => ['203.0.113.10'],
        ]));
    }

    private function fakePage(): void
    {
        Http::fake([
            self::URL => Http::response(
                file_get_contents(__DIR__.'/../Fixtures/recipe-jsonld.html'),
                200,
                ['Content-Type' => 'text/html']
            ),
        ]);
    }

    public function test_preview_returns_a_draft_without_persisting_a_recipe(): void
    {
        $this->fakePage();

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/preview-url', [
                'url' => self::URL,
                'tags' => ['sobremesa'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Bolo de Chocolate')
            ->assertJsonPath('data.source_url', self::URL)
            ->assertJsonPath('data.tags', ['sobremesa'])
            ->assertJsonStructure(['data' => ['id', 'title', 'ingredients', 'instructions', 'tags', 'source_url']]);

        // Importing must not write anything to the recipes table - that only
        // happens after the user reviews the draft and confirms.
        $this->assertDatabaseCount('recipes', 0);
    }

    public function test_draft_can_be_refetched_by_id(): void
    {
        $this->fakePage();

        $id = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/preview-url', ['url' => self::URL])
            ->json('data.id');

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/recipes/drafts/{$id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $id)
            ->assertJsonPath('data.title', 'Bolo de Chocolate');
    }

    public function test_missing_draft_returns_404(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/recipes/drafts/does-not-exist');

        $response->assertStatus(404);
    }

    public function test_another_user_cannot_read_the_draft(): void
    {
        $this->fakePage();

        $id = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/preview-url', ['url' => self::URL])
            ->json('data.id');

        $other = User::factory()->create();

        $this->actingAs($other, 'api')
            ->getJson("/api/recipes/drafts/{$id}")
            ->assertStatus(404);
    }

    public function test_preview_rejects_non_whitelisted_domain(): void
    {
        Http::fake();

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/preview-url', ['url' => 'https://evil.com/recipe']);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Domain not whitelisted.']);

        Http::assertNothingSent();
    }

    public function test_preview_requires_authentication(): void
    {
        $this->postJson('/api/recipes/preview-url', ['url' => self::URL])
            ->assertStatus(401);
    }

    public function test_preview_requires_a_url(): void
    {
        $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/preview-url', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }
}
