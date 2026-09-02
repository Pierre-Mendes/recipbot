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
}
