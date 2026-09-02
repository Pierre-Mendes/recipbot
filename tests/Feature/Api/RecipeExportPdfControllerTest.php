<?php

namespace Tests\Feature\Api;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecipeExportPdfControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_exports_a_recipe_as_pdf(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create([
            'title' => 'Pão de Queijo',
            'ingredients' => ['500g de polvilho', '2 ovos'],
            'instructions' => ['Misture.', 'Asse.'],
            'notes' => 'Servir quente',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->get("/api/recipes/{$recipe->id}/export-pdf");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
        $response->assertHeader('Content-Disposition', 'attachment; filename="pao-de-queijo.pdf"');

        // A real PDF starts with the %PDF- magic bytes.
        $this->assertStringStartsWith('%PDF-', (string) $response->getContent());
    }

    public function test_cannot_export_pdf_of_another_users_recipe(): void
    {
        $recipe = Recipe::factory()->for(User::factory()->create())->create();

        $this->actingAs($this->user, 'api')
            ->get("/api/recipes/{$recipe->id}/export-pdf")
            ->assertStatus(403);
    }

    public function test_pdf_export_requires_authentication(): void
    {
        $recipe = Recipe::factory()->for($this->user)->create();

        $this->getJson("/api/recipes/{$recipe->id}/export-pdf")->assertStatus(401);
    }
}
