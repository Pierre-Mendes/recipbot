<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiDocumentationTest extends TestCase
{
    public function test_docs_ui_is_available_outside_production(): void
    {
        $response = $this->get('/docs');

        $response->assertOk()
            ->assertSee('SwaggerUIBundle');
    }

    public function test_openapi_yaml_is_served_outside_production(): void
    {
        $response = $this->get('/docs/openapi.yaml');

        $response->assertOk()
            ->assertHeader('content-type', 'application/yaml; charset=UTF-8');

        $this->assertStringContainsString('openapi: 3.0.3', $response->getContent());
    }
}
