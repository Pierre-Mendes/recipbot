<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use PHPOpenSourceSaver\JWTAuth\JWTGuard;

class AuthController
{
    /**
     * Register a new user. Does not log them in - they authenticate
     * separately via /api/auth/login.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

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

        $guard = $this->jwtGuard();

        if (! $token = $guard->attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // attempt()'s declared bool|string return is imprecise: with the
        // default $login=true it's actually string|false, never true.
        assert(is_string($token));

        return $this->respondWithToken($token);
    }

    /**
     * The "api" guard is always the JWT guard (see config/auth.php); assert
     * the concrete type since Auth::guard()'s contract type doesn't expose
     * JWT-specific methods like attempt()'s string return or factory().
     */
    private function jwtGuard(): JWTGuard
    {
        $guard = Auth::guard('api');
        assert($guard instanceof JWTGuard);

        return $guard;
    }

    /**
     * Invalidate the current token.
     */
    public function logout(): JsonResponse
    {
        $this->jwtGuard()->logout();

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
            'expires_in' => $this->jwtGuard()->factory()->getTTL() * 60,
        ]);
    }
}
