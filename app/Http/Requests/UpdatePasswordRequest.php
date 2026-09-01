<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // `current_password:api` checks the value against the authenticated
            // (JWT-guarded) user's stored hash, so a wrong current password is
            // rejected before we touch anything.
            'current_password' => ['required', 'string', 'current_password:api'],
            'password' => ['required', 'string', Password::min(8), 'confirmed', 'different:current_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.current_password' => 'The current password is incorrect',
            'password.confirmed' => 'Password confirmation does not match',
            'password.different' => 'The new password must be different from the current one',
        ];
    }
}
