<?php

namespace Tests\Feature\Frontend;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResetPasswordPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_page_loads_with_valid_token(): void
    {
        $user = User::factory()->create();
        $token = 'valid-token';

        $response = $this->get(
            '/reset-password?token='.$token.'&email='.urlencode($user->email)
        );

        $response->assertStatus(200);
    }

    public function test_reset_password_page_shows_error_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(400);
    }
}
