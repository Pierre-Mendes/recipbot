<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ApiDocumentationTest extends TestCase
{
    public function test_docs_ui_is_available_outside_production(): void
    {
        $response = $this->get('/docs');

        $response->assertOk()
            ->assertSee('SwaggerUIBundle');
    }

    public function test_docs_ui_returns_404_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        try {
            $this->get('/docs')->assertNotFound();
        } finally {
            $this->app->detectEnvironment(fn () => 'testing');
        }
    }

    #[DataProvider('openApiYamlExpectedFragments')]
    public function test_openapi_yaml_is_served_outside_production(string $expectedFragment): void
    {
        $response = $this->get('/docs/openapi.yaml');

        $response->assertOk()
            ->assertHeader('content-type', 'application/yaml; charset=UTF-8');

        $this->assertStringContainsString($expectedFragment, $response->getContent());
    }

    /**
     * @return \Generator<string, array{0: string}>
     */
    public static function openApiYamlExpectedFragments(): \Generator
    {
        yield 'openapi version' => ['openapi: 3.0.3'];
        yield 'api title' => ['title: RecipBot Backend API'];
        yield 'bearer scheme' => ['scheme: bearer'];
    }

    public function test_openapi_yaml_returns_404_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        try {
            $this->get('/docs/openapi.yaml')->assertNotFound();
        } finally {
            $this->app->detectEnvironment(fn () => 'testing');
        }
    }
}
