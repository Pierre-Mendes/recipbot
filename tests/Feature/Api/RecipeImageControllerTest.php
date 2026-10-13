<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class RecipeImageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        config(['recipbot.images.disk' => 'recipe-images']);
        Storage::fake('recipe-images');
        $this->user = User::factory()->create();
    }

    public function test_uploads_a_photo_and_returns_its_url(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        $response = $this->actingAs($this->user, 'api')
            ->post("/api/recipes/{$recipe->id}/image", [
                'image' => UploadedFile::fake()->image('bolo.jpg', 800, 600),
            ], ['Accept' => 'application/json']);

        $response->assertOk();

        $path = $recipe->fresh()?->image_path;
        $this->assertNotNull($path);
        $this->assertStringStartsWith("recipes/{$this->user->id}/", $path);
        $this->assertStringEndsWith('.jpg', $path);
        Storage::disk('recipe-images')->assertExists($path);
        $response->assertJsonPath('data.image_url', Storage::disk('recipe-images')->url($path));
    }

    public function test_replacing_a_photo_deletes_the_previous_one(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();
        $this->actingAs($this->user, 'api')->post("/api/recipes/{$recipe->id}/image", [
            'image' => UploadedFile::fake()->image('first.png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $first = (string) $recipe->fresh()?->image_path;

        $this->actingAs($this->user, 'api')->post("/api/recipes/{$recipe->id}/image", [
            'image' => UploadedFile::fake()->image('second.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('recipe-images')->assertMissing($first);
        Storage::disk('recipe-images')->assertExists((string) $recipe->fresh()?->image_path);
    }

    public function test_rejects_files_that_are_not_raster_images(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        foreach ([
            UploadedFile::fake()->create('receita.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        ] as $file) {
            $this->actingAs($this->user, 'api')
                ->post("/api/recipes/{$recipe->id}/image", ['image' => $file], ['Accept' => 'application/json'])
                ->assertStatus(422)
                ->assertJsonValidationErrors('image');
        }

        $this->assertNull($recipe->fresh()?->image_path);
    }

    public function test_rejects_images_above_the_size_limit(): void
    {
        config(['recipbot.images.max_file_kb' => 100]);
        $recipe = Recipe::factory()->for($this->user)->create();

        $this->actingAs($this->user, 'api')
            ->post("/api/recipes/{$recipe->id}/image", [
                'image' => UploadedFile::fake()->image('big.jpg')->size(200),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }

    public function test_cannot_upload_a_photo_to_another_users_recipe(): void
    {
        $recipe = Recipe::factory()->for(User::factory())->create();

        $this->actingAs($this->user, 'api')
            ->post("/api/recipes/{$recipe->id}/image", [
                'image' => UploadedFile::fake()->image('bolo.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertForbidden();

        $this->assertNull($recipe->fresh()?->image_path);
        $this->assertSame([], Storage::disk('recipe-images')->allFiles());
    }

    public function test_returns_503_when_the_storage_refuses_the_write(): void
    {
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('putFileAs')->andReturn(false);
        Storage::shouldReceive('disk')->andReturn($disk);
        $recipe = Recipe::factory()->for($this->user)->create();

        $this->actingAs($this->user, 'api')
            ->post("/api/recipes/{$recipe->id}/image", [
                'image' => UploadedFile::fake()->image('bolo.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(503);

        $this->assertNull($recipe->fresh()?->image_path);
    }

    public function test_removes_the_photo(): void
    {
        Storage::disk('recipe-images')->put('recipes/1/old.jpg', 'bytes');
        $recipe = Recipe::factory()->for($this->user)->create();
        $recipe->forceFill(['image_path' => 'recipes/1/old.jpg'])->save();

        $this->actingAs($this->user, 'api')
            ->deleteJson("/api/recipes/{$recipe->id}/image")
            ->assertOk()
            ->assertJsonPath('data.image_url', null);

        Storage::disk('recipe-images')->assertMissing('recipes/1/old.jpg');
        $this->assertNull($recipe->fresh()?->image_path);
    }

    public function test_cannot_remove_the_photo_of_another_users_recipe(): void
    {
        Storage::disk('recipe-images')->put('recipes/9/theirs.jpg', 'bytes');
        $recipe = Recipe::factory()->for(User::factory())->create();
        $recipe->forceFill(['image_path' => 'recipes/9/theirs.jpg'])->save();

        $this->actingAs($this->user, 'api')
            ->deleteJson("/api/recipes/{$recipe->id}/image")
            ->assertForbidden();

        Storage::disk('recipe-images')->assertExists('recipes/9/theirs.jpg');
    }

    public function test_can_create_and_change_a_default_cover(): void
    {
        $response = $this->actingAs($this->user, 'api')->postJson('/api/recipes', [
            'title' => 'Bolo de Queijo',
            'ingredients' => ['3 ovos'],
            'cover' => 'cake',
        ]);

        $response->assertCreated()->assertJsonPath('data.cover', 'cake');
        $id = $response->json('data.id');

        $this->actingAs($this->user, 'api')
            ->patchJson("/api/recipes/{$id}", ['cover' => null])
            ->assertOk()
            ->assertJsonPath('data.cover', null);
    }

    public function test_rejects_an_unknown_cover(): void
    {
        $this->actingAs($this->user, 'api')->postJson('/api/recipes', [
            'title' => 'Bolo de Queijo',
            'ingredients' => ['3 ovos'],
            'cover' => 'pizza',
        ])->assertStatus(422)->assertJsonValidationErrors('cover');
    }
}
