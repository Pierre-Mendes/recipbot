<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ExceptionHandlingTest extends TestCase
{
    public function test_unexpected_api_errors_return_a_friendly_message_in_production(): void
    {
        config(['app.debug' => false]);

        Route::get('/api/_boom', function () {
            throw new \RuntimeException('select * from "users" where "email" = leaky@example.com');
        });

        $response = $this->getJson('/api/_boom');

        // The scrubbed 500 response carries the friendly message plus a
        // meta.request_id (a dynamic UUID) for incident correlation, so match
        // on the message and structure rather than an exact JSON body.
        $response->assertStatus(500)
            ->assertJsonPath('message', 'Ocorreu um erro inesperado. Tente novamente em instantes.')
            ->assertJsonStructure(['message', 'meta' => ['request_id']]);

        // The raw internal detail must never reach the client.
        $this->assertStringNotContainsString('select *', $response->getContent());
    }

    public function test_unexpected_api_errors_still_show_details_when_debug_is_on(): void
    {
        config(['app.debug' => true]);

        Route::get('/api/_boom', function () {
            throw new \RuntimeException('raw internal detail for developers');
        });

        $response = $this->getJson('/api/_boom');

        $response->assertStatus(500);
        $this->assertStringContainsString('raw internal detail for developers', $response->getContent());
    }

    public function test_validation_errors_are_still_returned_as_422(): void
    {
        config(['app.debug' => false]);

        // Missing all required fields must still surface field-level errors,
        // not the generic 500 message.
        $response = $this->postJson('/api/auth/register', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name', 'email', 'password']);
    }
}
