<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class RecipeImportPdfControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /**
     * @var list<string>
     */
    private array $tempFiles = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $path) {
            @unlink($path);
        }

        parent::tearDown();
    }

    /**
     * Build a real multi-page PDF with a text layer, one HTML chunk per page.
     *
     * @param  list<string>  $pages
     */
    private function pdf(array $pages): UploadedFile
    {
        $html = implode('<div style="page-break-after: always"></div>', $pages);
        $path = tempnam(sys_get_temp_dir(), 'pdf').'.pdf';
        file_put_contents($path, Pdf::loadHTML($html)->output());
        $this->tempFiles[] = $path;

        return new UploadedFile($path, 'ebook.pdf', 'application/pdf', null, true);
    }

    private function cookbook(): UploadedFile
    {
        return $this->pdf([
            '<h1>Bolos juninos</h1>',
            '<h1>Bolo de milho</h1>',
            '<p>Ingredientes</p><p>1 lata de milho</p><p>3 ovos</p><p>Preparo:</p><p>Bata tudo e asse.</p>',
            '<h1>Bolo de coco</h1>',
            '<p>Ingredientes</p><p>2 xicaras de coco</p><p>Preparo:</p><p>Misture e asse.</p>',
        ]);
    }

    public function test_analyzes_a_pdf_into_pages_and_suggested_recipes_without_drafting(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => $this->cookbook()], ['Accept' => 'application/json']);

        $response->assertStatus(201)
            ->assertJsonPath('data.page_count', 5)
            ->assertJsonPath('data.pages.0.number', 1)
            ->assertJsonPath('data.pages.0.has_text', true)
            ->assertJsonPath('data.recipes', [
                ['title' => 'Bolo de milho', 'pages' => [2, 3]],
                ['title' => 'Bolo de coco', 'pages' => [4, 5]],
            ]);

        $this->assertStringContainsString('Bolos juninos', $response->json('data.pages.0.excerpt'));
        $this->assertDatabaseCount('recipes', 0);
    }

    public function test_confirming_page_groups_creates_one_draft_per_recipe(): void
    {
        $id = $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => $this->cookbook()], ['Accept' => 'application/json'])
            ->json('data.id');

        // The user renamed the first recipe and kept only the second's
        // ingredients page.
        $response = $this->actingAs($this->user, 'api')->postJson("/api/recipes/import-pdf/{$id}/drafts", [
            'recipes' => [
                ['title' => 'Bolo de milho verde', 'pages' => [3, 2]],
                ['title' => null, 'pages' => [5]],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Bolo de milho verde')
            ->assertJsonPath('data.0.ingredients', ['1 lata de milho', '3 ovos'])
            ->assertJsonPath('data.0.instructions', ['Bata tudo e asse.'])
            ->assertJsonPath('data.1.ingredients', ['2 xicaras de coco']);

        // Each draft is fetchable through the regular review endpoint...
        $this->actingAs($this->user, 'api')
            ->getJson('/api/recipes/drafts/'.$response->json('data.1.id'))
            ->assertOk();

        // ...and still nothing is saved until each one is reviewed.
        $this->assertDatabaseCount('recipes', 0);
    }

    public function test_rejects_pages_beyond_the_document(): void
    {
        $id = $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => $this->cookbook()], ['Accept' => 'application/json'])
            ->json('data.id');

        $this->actingAs($this->user, 'api')
            ->postJson("/api/recipes/import-pdf/{$id}/drafts", ['recipes' => [['pages' => [6]]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['recipes.0.pages']);
    }

    public function test_another_user_cannot_confirm_someone_elses_import(): void
    {
        $id = $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => $this->cookbook()], ['Accept' => 'application/json'])
            ->json('data.id');

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson("/api/recipes/import-pdf/{$id}/drafts", ['recipes' => [['pages' => [1]]]])
            ->assertStatus(404);
    }

    public function test_rejects_a_pdf_with_more_pages_than_allowed(): void
    {
        config(['recipbot.pdf_import.max_pages' => 2]);

        $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => $this->cookbook()], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJson(['message' => 'This PDF has too many pages (max 2).']);
    }

    public function test_rejects_a_pdf_without_a_text_layer(): void
    {
        $file = $this->pdf(['<div style="width:10px;height:10px;background:#000"></div>']);

        $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => $file], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJson(['message' => 'This PDF has no readable text (it may be a scanned image).']);
    }

    public function test_rejects_a_non_pdf_upload(): void
    {
        $this->actingAs($this->user, 'api')
            ->post('/api/recipes/import-pdf', ['file' => UploadedFile::fake()->image('bolo.png')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_requires_authentication(): void
    {
        $this->postJson('/api/recipes/import-pdf', [])->assertStatus(401);
        $this->postJson('/api/recipes/import-pdf/abc/drafts', [])->assertStatus(401);
    }
}
