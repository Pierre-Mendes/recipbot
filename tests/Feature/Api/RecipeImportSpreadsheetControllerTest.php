<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use App\Services\RecipeSpreadsheetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class RecipeImportSpreadsheetControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** Build a real .xlsx from a recipe using the same service, saved to a temp path. */
    private function xlsxFor(Recipe $recipe): string
    {
        $bytes = app(RecipeSpreadsheetService::class)->write([$recipe]);
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        file_put_contents($path, $bytes);

        return $path;
    }

    public function test_imports_a_spreadsheet_into_a_reviewable_draft_without_persisting(): void
    {
        $source = Recipe::factory()->make([
            'title' => 'Panqueca',
            'ingredients' => ['1 xícara de leite', '2 ovos'],
            'instructions' => ['Bata tudo.', 'Frite.'],
            'tags' => ['rápido', 'café'],
            'notes' => 'Boa com mel',
            'source_url' => 'https://example.com/panqueca',
        ]);
        $path = $this->xlsxFor($source);

        $file = new UploadedFile($path, 'panqueca.xlsx', null, null, true);

        $response = $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-spreadsheet', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Panqueca')
            ->assertJsonPath('data.ingredients', ['1 xícara de leite', '2 ovos'])
            ->assertJsonPath('data.instructions', ['Bata tudo.', 'Frite.'])
            ->assertJsonPath('data.tags', ['rápido', 'café'])
            ->assertJsonPath('data.notes', 'Boa com mel')
            ->assertJsonPath('data.source_url', 'https://example.com/panqueca')
            ->assertJsonStructure(['data' => ['id']]);

        // Import produces a draft; nothing is saved until the user confirms.
        $this->assertDatabaseCount('recipes', 0);

        unlink($path);
    }

    public function test_rejects_a_non_xlsx_upload(): void
    {
        $file = UploadedFile::fake()->createWithContent('notes.txt', 'not a spreadsheet');

        $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-spreadsheet', ['file' => $file], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_requires_authentication(): void
    {
        $this->postJson('/api/recipes/import-spreadsheet', [])->assertStatus(401);
    }
}
