<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\Password;

class PasswordResetService
{
    /**
     * Send a password reset link. Returns the broker status constant;
     * the controller always responds generically to avoid email enumeration.
     */
    public function sendResetLink(string $email): string
    {
        return Password::sendResetLink(
            ['email' => $email],
            function (User $user, string $token): string {
                $user->notify(new ResetPasswordNotification($token, $user->email));

                return $token;
            },
        );
    }

    /**
     * Reset the password using the broker (validates token, respects
     * expiry, invalidates the token after use). Returns the broker
     * status constant, Password::PASSWORD_RESET on success.
     */
    public function resetPassword(string $email, string $token, string $password): string
    {
        $credentials = [
            'email' => $email,
            'token' => $token,
            'password' => $password,
            'password_confirmation' => $password,
        ];

        return Password::reset(
            $credentials,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => bcrypt($password),
                ])->save();
            },
        );
    }
}
