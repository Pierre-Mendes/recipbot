<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
            'password' => Hash::make('current-password'),
        ]);
    }

    public function test_can_update_name_and_email(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->patchJson('/api/auth/me', ['name' => 'New Name', 'email' => 'New@Example.com']);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.email', 'new@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'name' => 'New Name',
            'email' => 'new@example.com',
        ]);
    }

    public function test_email_must_be_unique_across_other_users(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($this->user, 'api')
            ->patchJson('/api/auth/me', ['email' => 'taken@example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_keeping_own_email_is_allowed(): void
    {
        $this->actingAs($this->user, 'api')
            ->patchJson('/api/auth/me', ['name' => 'Renamed', 'email' => 'old@example.com'])
            ->assertStatus(200);
    }

    public function test_profile_update_requires_authentication(): void
    {
        $this->patchJson('/api/auth/me', ['name' => 'X'])->assertStatus(401);
    }

    public function test_can_change_password_with_the_correct_current_password(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->putJson('/api/auth/password', [
                'current_password' => 'current-password',
                'password' => 'brand-new-password',
                'password_confirmation' => 'brand-new-password',
            ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('brand-new-password', $this->user->refresh()->password));
    }

    public function test_wrong_current_password_is_rejected(): void
    {
        $this->actingAs($this->user, 'api')
            ->putJson('/api/auth/password', [
                'current_password' => 'wrong-password',
                'password' => 'brand-new-password',
                'password_confirmation' => 'brand-new-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check('current-password', $this->user->refresh()->password));
    }

    public function test_new_password_must_be_confirmed(): void
    {
        $this->actingAs($this->user, 'api')
            ->putJson('/api/auth/password', [
                'current_password' => 'current-password',
                'password' => 'brand-new-password',
                'password_confirmation' => 'does-not-match',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
