<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class RecipeImportFileControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_imports_a_text_pdf_into_a_reviewable_draft_without_persisting(): void
    {
        // A real PDF with a text layer, built inline, so pdfparser can read it
        // back - no OCR needed for this path.
        $html = <<<'HTML'
        <h1>Bolo Simples</h1>
        <p>Ingredientes</p>
        <p>2 xicaras de farinha</p>
        <p>3 ovos</p>
        <p>Modo de preparo</p>
        <p>Misture os ingredientes com cuidado ate ficar homogeneo.</p>
        HTML;
        $bytes = Pdf::loadHTML($html)->output();
        $path = tempnam(sys_get_temp_dir(), 'imp').'.pdf';
        file_put_contents($path, $bytes);

        $file = new UploadedFile($path, 'bolo.pdf', 'application/pdf', null, true);

        $response = $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-file', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'title', 'ingredients', 'instructions']]);

        // Extraction is heuristic, so assert the shape/content leniently rather
        // than exact arrays: a title and at least one ingredient came through.
        $data = $response->json('data');
        $this->assertNotSame('', $data['title']);
        $this->assertNotEmpty($data['ingredients']);

        // Import produces a draft; nothing is saved until the user confirms.
        $this->assertDatabaseCount('recipes', 0);

        unlink($path);
    }

    public function test_rejects_an_unsupported_file_type(): void
    {
        $file = UploadedFile::fake()->createWithContent('recipe.txt', 'just text');

        $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-file', ['file' => $file], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_requires_authentication(): void
    {
        $this->postJson('/api/recipes/import-file', [])->assertStatus(401);
    }
}
