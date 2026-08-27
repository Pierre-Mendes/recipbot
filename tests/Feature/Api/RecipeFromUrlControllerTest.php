<?php

namespace Tests\Feature\Api;

use App\Contracts\HostResolver;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Doubles\FakeHostResolver;
use Tests\TestCase;

class RecipeFromUrlControllerTest extends TestCase
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

    public function test_creates_recipe_from_url(): void
    {
        Http::fake([
            self::URL => Http::response(
                file_get_contents(__DIR__.'/../Fixtures/recipe-jsonld.html'),
                200,
                ['Content-Type' => 'text/html']
            ),
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/from-url', [
                'url' => self::URL,
                'tags' => ['sobremesa'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Bolo de Chocolate')
            ->assertJsonPath('data.source_url', self::URL)
            ->assertJsonPath('data.tags', ['sobremesa']);

        $this->assertDatabaseHas('recipes', [
            'user_id' => $this->user->id,
            'title' => 'Bolo de Chocolate',
            'source_url' => self::URL,
        ]);
    }

    public function test_rejects_non_whitelisted_domain(): void
    {
        Http::fake();

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/from-url', ['url' => 'https://evil.com/recipe']);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Domain not whitelisted.']);

        Http::assertNothingSent();
    }

    public function test_rejects_private_ip_via_dns_rebinding(): void
    {
        $this->app->bind(HostResolver::class, fn () => new FakeHostResolver([
            'tudogostoso.com.br' => ['10.0.0.5'],
        ]));

        Http::fake();

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/from-url', ['url' => self::URL]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Private IP blocked.']);

        Http::assertNothingSent();
    }

    public function test_requires_authentication(): void
    {
        $response = $this->postJson('/api/recipes/from-url', ['url' => self::URL]);

        $response->assertStatus(401);
    }

    public function test_requires_a_url(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/recipes/from-url', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }
}
