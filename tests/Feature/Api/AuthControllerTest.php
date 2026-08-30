<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Pierre Mendes',
            'email' => 'pierre@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'name', 'email'], 'message'])
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', ['email' => 'pierre@example.com']);
    }

    public function test_cannot_register_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Someone Else',
            'email' => 'taken@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_register_with_duplicate_email_of_different_case(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Someone Else',
            'email' => 'Taken@Example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_register_stores_email_normalized_to_lowercase(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Pierre Mendes',
            'email' => 'Pierre@Example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'pierre@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'Pierre@Example.com']);
    }

    public function test_can_reregister_email_of_a_soft_deleted_user(): void
    {
        $deleted = User::factory()->create(['email' => 'gone@example.com']);
        $deleted->delete();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'New Owner',
            'email' => 'gone@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'gone@example.com', 'name' => 'New Owner']);
    }

    public function test_register_is_throttled_after_five_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/register', [
                'name' => 'Pierre Mendes',
                'email' => 'short',
                'password' => 'short',
                'password_confirmation' => 'different',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/register', [
            'name' => 'Pierre Mendes',
            'email' => 'short',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertStatus(429);
    }

    public function test_cannot_register_with_mismatched_password_confirmation(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Pierre Mendes',
            'email' => 'pierre@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_cannot_register_with_short_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Pierre Mendes',
            'email' => 'pierre@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_can_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'pierre@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'pierre@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in'])
            ->assertJson(['token_type' => 'Bearer']);
    }

    public function test_can_login_with_email_of_different_case(): void
    {
        User::factory()->create([
            'email' => 'pierre@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'Pierre@Example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in']);
    }

    public function test_cannot_login_with_wrong_password(): void
    {
        User::factory()->create([
            'email' => 'pierre@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'pierre@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_cannot_login_with_unknown_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_is_throttled_after_five_attempts(): void
    {
        User::factory()->create(['email' => 'pierre@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'pierre@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(401);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'pierre@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_can_get_current_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson(['data' => ['id' => $user->id, 'email' => $user->email]]);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    public function test_can_logout(): void
    {
        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $response->assertStatus(200);

        // The same token should no longer be usable after logout.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }
}
