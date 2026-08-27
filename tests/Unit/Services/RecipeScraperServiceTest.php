<?php

namespace Tests\Unit\Services;

use App\Exceptions\RecipeScrapingException;
use App\Services\RecipeScraperService;
use App\Services\SsrfGuard;
use Illuminate\Support\Facades\Http;
use Tests\Doubles\FakeHostResolver;
use Tests\TestCase;

class RecipeScraperServiceTest extends TestCase
{
    private const URL = 'https://tudogostoso.com.br/receita/1-bolo.html';

    private function service(): RecipeScraperService
    {
        $guard = new SsrfGuard(new FakeHostResolver([
            'tudogostoso.com.br' => ['203.0.113.10'],
        ]));

        return new RecipeScraperService($guard);
    }

    public function test_extracts_recipe_from_json_ld(): void
    {
        Http::fake([
            self::URL => Http::response(
                file_get_contents(__DIR__.'/../../Feature/Fixtures/recipe-jsonld.html'),
                200,
                ['Content-Type' => 'text/html']
            ),
        ]);

        $result = $this->service()->extract(self::URL);

        $this->assertSame('Bolo de Chocolate', $result['title']);
        $this->assertSame(
            ['2 xicaras de farinha', '1 xicara de acucar', '3 ovos'],
            $result['ingredients']
        );
        $this->assertSame(
            [
                'Misture os ingredientes secos.',
                'Adicione os ovos e misture bem.',
                'Asse por 40 minutos a 180C.',
            ],
            $result['instructions']
        );
    }

    public function test_falls_back_to_heuristic_parsing_without_json_ld(): void
    {
        Http::fake([
            self::URL => Http::response(
                file_get_contents(__DIR__.'/../../Feature/Fixtures/recipe-heuristic.html'),
                200,
                ['Content-Type' => 'text/html']
            ),
        ]);

        $result = $this->service()->extract(self::URL);

        $this->assertSame('Churros Crocantes', $result['title']);
        $this->assertSame(
            ['2 xicaras de agua', '1 xicara de farinha', 'Acucar e canela'],
            $result['ingredients']
        );
        $this->assertSame([], $result['instructions']);
    }

    public function test_throws_when_nothing_extractable(): void
    {
        Http::fake([
            self::URL => Http::response('<html><body>nothing here</body></html>', 200),
        ]);

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Could not extract a recipe from this page.');

        $this->service()->extract(self::URL);
    }

    public function test_throws_on_non_successful_response(): void
    {
        Http::fake([
            self::URL => Http::response('not found', 404),
        ]);

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Could not fetch the page.');

        $this->service()->extract(self::URL);
    }

    public function test_throws_on_response_exceeding_max_size(): void
    {
        Http::fake([
            self::URL => Http::response('x', 200, ['Content-Length' => (string) (6 * 1024 * 1024)]),
        ]);

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Response too large.');

        $this->service()->extract(self::URL);
    }

    public function test_rejects_non_whitelisted_domain_before_any_http_call(): void
    {
        Http::fake();

        try {
            $this->service()->extract('https://evil.com/recipe');
            $this->fail('Expected RecipeScrapingException was not thrown.');
        } catch (RecipeScrapingException $e) {
            $this->assertSame('Domain not whitelisted.', $e->getMessage());
        }

        Http::assertNothingSent();
    }
}
