<?php

namespace Tests\Unit\Services;

use App\Services\RecipePdfSegmenter;
use App\Services\RecipeTextImportService;
use Tests\TestCase;

class RecipePdfSegmenterTest extends TestCase
{
    private function segmenter(): RecipePdfSegmenter
    {
        return new RecipePdfSegmenter(new RecipeTextImportService);
    }

    public function test_groups_an_ebook_into_recipes_leaving_cover_index_and_closing_pages_out(): void
    {
        // Mirrors a real "curso de bolos" e-book: cover, index, then per
        // recipe a title page, an ingredients page, a tips page; then extras.
        $pages = [
            "Bolos juninos\nEspecial junino",
            "Índice:\nBolo de milho\nBolo de coco",
            "Bolo de\nmilho",
            "Ingredientes\nBolo de milho\n1 lata de milho\nPreparo:\nBata tudo e leve ao forno.",
            "Anote essa dica:\nUse milho verde.",
            'Bolo de coco',
            "Ingredientes\nBolo de coco\n3 ovos\nPreparo:\nMisture tudo e asse por",
            "40 minutos.\nSirva frio.",
            "Marcas que uso:\nManteiga: Itambé",
            "Chegamos ao fim...\nBoas vendas!",
        ];

        $this->assertSame([
            ['title' => 'Bolo de milho', 'pages' => [3, 4, 5]],
            ['title' => 'Bolo de coco', 'pages' => [6, 7, 8]],
        ], $this->segmenter()->segment($pages));
    }

    public function test_takes_the_title_from_the_ingredients_page_without_a_title_page(): void
    {
        $pages = [
            "Pudim\nIngredientes\n1 lata de leite condensado\nModo de preparo\nBata e asse.",
            "Mousse\nIngredientes\n2 claras\nModo de preparo\nBata e gele.",
        ];

        $this->assertSame([
            ['title' => 'Pudim', 'pages' => [1]],
            ['title' => 'Mousse', 'pages' => [2]],
        ], $this->segmenter()->segment($pages));
    }

    public function test_falls_back_to_one_recipe_of_all_text_pages_without_headers(): void
    {
        $pages = ["Panqueca\n2 ovos", '', 'Misture tudo e frite.'];

        $this->assertSame(
            [['title' => 'Panqueca', 'pages' => [1, 3]]],
            $this->segmenter()->segment($pages)
        );
    }

    public function test_suggests_nothing_for_a_pdf_without_text(): void
    {
        $this->assertSame([], $this->segmenter()->segment(['', '']));
    }
}
