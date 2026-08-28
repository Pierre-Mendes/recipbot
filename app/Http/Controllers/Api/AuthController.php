<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthController
{
    /**
     * Postgres SQLSTATE for a unique constraint violation.
     */
    private const UNIQUE_VIOLATION = '23505';

    /**
     * Register a new user. Does not log them in - they authenticate
     * separately via /api/auth/login.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = User::create($request->validated());
        } catch (QueryException $e) {
            if ($e->getCode() === self::UNIQUE_VIOLATION) {
                // Two concurrent registrations can both pass the request's
                // unique validation before either commits; the DB's unique
                // index is the real guard, so translate its violation into
                // the same validation-error shape the FormRequest produces.
                throw ValidationException::withMessages([
                    'email' => ['An account with this email already exists'],
                ]);
            }

            throw $e;
        }

        return response()->json([
            'data' => $user,
            'message' => 'Registration successful, please log in',
        ], 201);
    }

    /**
     * Authenticate and issue a JWT access token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! $token = JWTAuth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Invalidate the current token.
     */
    public function logout(): JsonResponse
    {
        if (! Auth::guard('api')->check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        Auth::guard('api')->logout();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()]);
    }

    private function respondWithToken(string $token): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
        ]);
    }
}
