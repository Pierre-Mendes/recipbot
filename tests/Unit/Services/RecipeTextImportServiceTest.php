<?php

namespace Tests\Unit\Services;

use App\Services\RecipeTextImportService;
use Tests\TestCase;

class RecipeTextImportServiceTest extends TestCase
{
    private function service(): RecipeTextImportService
    {
        return new RecipeTextImportService;
    }

    public function test_parses_text_with_explicit_section_headers(): void
    {
        $text = implode("\n", [
            'Bolo de Cenoura',
            'Ingredientes',
            '3 cenouras médias',
            '2 xícaras de farinha',
            'Modo de preparo',
            '1. Bata as cenouras.',
            '2. Asse por 40 minutos.',
        ]);

        $draft = $this->service()->parse($text);

        $this->assertSame('Bolo de Cenoura', $draft['title']);
        $this->assertSame(['3 cenouras médias', '2 xícaras de farinha'], $draft['ingredients']);
        // Leading step numbers are stripped (the UI numbers steps itself).
        $this->assertSame(['Bata as cenouras.', 'Asse por 40 minutos.'], $draft['instructions']);
    }

    public function test_falls_back_to_classifying_lines_without_headers(): void
    {
        $text = implode("\n", [
            'Panqueca',
            '2 ovos',
            '1 xícara de leite',
            'Misture tudo e frite dos dois lados.',
        ]);

        $draft = $this->service()->parse($text);

        $this->assertSame('Panqueca', $draft['title']);
        $this->assertSame(['2 ovos', '1 xícara de leite'], $draft['ingredients']);
        $this->assertSame(['Misture tudo e frite dos dois lados.'], $draft['instructions']);
    }

    public function test_strips_bullets_from_ingredient_lines(): void
    {
        $text = "Salada\nIngredientes\n- alface\n- tomate\nModo de preparo\nCorte e misture os vegetais frescos.";

        $draft = $this->service()->parse($text);

        $this->assertSame(['alface', 'tomate'], $draft['ingredients']);
    }

    public function test_returns_an_empty_draft_for_blank_text(): void
    {
        $draft = $this->service()->parse("   \n  \n");

        $this->assertSame('', $draft['title']);
        $this->assertSame([], $draft['ingredients']);
        $this->assertSame([], $draft['instructions']);
    }

    public function test_joins_lines_that_the_pdf_wrapped_mid_sentence(): void
    {
        $text = implode("\n", [
            'Bolo de abóbora',
            'Ingredientes',
            '2 xícaras de abóbora picada e',
            'descascada (350 gramas)',
            '3 ovos',
            'Preparo:',
            'No liquidificador coloque os ovos e a',
            'abóbora. Bata até que fique uma',
            'massa lisa.',
            'Leve ao forno por 45 minutos.',
        ]);

        $draft = $this->service()->parse($text);

        $this->assertSame(['2 xícaras de abóbora picada e descascada (350 gramas)', '3 ovos'], $draft['ingredients']);
        $this->assertSame([
            'No liquidificador coloque os ovos e a abóbora. Bata até que fique uma massa lisa.',
            'Leve ao forno por 45 minutos.',
        ], $draft['instructions']);
    }

    public function test_keeps_sub_recipes_under_a_label_and_tips_as_notes(): void
    {
        $text = implode("\n", [
            'Ingredientes',
            'Bolo de coco',
            '3 ovos',
            'Preparo:',
            'Bata tudo.',
            'Cobertura',
            'Bolo de coco',
            '1 lata de leite condensado',
            'Preparo',
            'Leve ao fogo até engrossar.',
            'Anote essa dica:',
            'Use forma de 22 cm.',
        ]);

        $draft = $this->service()->parse($text, 'Bolo de coco');

        $this->assertSame('Bolo de coco', $draft['title']);
        // The title repeated under each header is not an ingredient.
        $this->assertSame(['3 ovos', 'Cobertura:', '1 lata de leite condensado'], $draft['ingredients']);
        $this->assertSame(['Bata tudo.', 'Cobertura:', 'Leve ao fogo até engrossar.'], $draft['instructions']);
        $this->assertSame('Use forma de 22 cm.', $draft['notes']);
    }

    public function test_guesses_the_title_when_the_text_opens_on_a_header(): void
    {
        $draft = $this->service()->parse("Ingredientes\nBolo de Queijo\n3 ovos\nPreparo:\nBata tudo.");

        $this->assertSame('Bolo de Queijo', $draft['title']);
        $this->assertSame(['3 ovos'], $draft['ingredients']);
    }
}
