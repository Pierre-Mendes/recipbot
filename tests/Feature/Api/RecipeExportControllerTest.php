<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use App\Services\RecipeSpreadsheetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use Tests\TestCase;

class RecipeExportControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_exports_a_recipe_as_xlsx(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create([
            'title' => 'Bolo de Cenoura',
            'ingredients' => ['2 xícaras de farinha', '3 ovos'],
            'instructions' => ['Misture tudo.', 'Asse por 40 min.'],
            'tags' => ['doce', 'bolo'],
            'notes' => 'Ver post no Instagram',
            'source_url' => 'https://example.com/bolo',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->get("/api/recipes/{$recipe->id}/export");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->assertHeader('Content-Disposition', 'attachment; filename="bolo-de-cenoura.xlsx"');

        // Round-trip: read the produced workbook back and assert the content.
        $path = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
        file_put_contents($path, $response->getContent());
        $sheet = (new XlsxReader)->load($path)->getActiveSheet();

        $this->assertSame(RecipeSpreadsheetService::LABEL_TITLE, $sheet->getCell('A1')->getValue());
        $this->assertSame('Bolo de Cenoura', $sheet->getCell('B1')->getValue());
        $this->assertSame('doce, bolo', $sheet->getCell('B3')->getValue());
        $this->assertSame('Ver post no Instagram', $sheet->getCell('B4')->getValue());
        $this->assertSame(RecipeSpreadsheetService::HEADING_INGREDIENTS, $sheet->getCell('A6')->getValue());
        $this->assertSame('2 xícaras de farinha', $sheet->getCell('A7')->getValue());
        $this->assertSame('3 ovos', $sheet->getCell('A8')->getValue());
        $this->assertSame('Bolo de Cenoura', $sheet->getTitle());

        unlink($path);
    }

    public function test_cannot_export_another_users_recipe(): void
    {
        $recipe = Recipe::factory()->for(User::factory()->create())->create();

        $this->actingAs($this->user, 'api')
            ->get("/api/recipes/{$recipe->id}/export")
            ->assertStatus(403);
    }

    public function test_export_requires_authentication(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        // getJson sends the Accept: application/json header so an unauthenticated
        // request renders as a 401 instead of a redirect to a nonexistent login
        // route (which would 500 in this API-only app).
        $this->getJson("/api/recipes/{$recipe->id}/export")->assertStatus(401);
    }
}
