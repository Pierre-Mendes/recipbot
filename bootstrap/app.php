<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use App\Http\Middleware\ApiRequestContext;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(ApiRequestContext::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Never leak internal error details (SQL, stack traces, the user's
        // own email echoed back in a query) to API clients in production.
        // Unexpected failures are still logged by the framework; the client
        // just gets a clean, friendly message.
        $exceptions->render(function (Throwable $e, Request $request) {
            // Only shape JSON/API responses; leave web rendering untouched.
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            // Keep the framework's structured responses: validation errors
            // (422), authentication (401), 404s, throttling (429) and any
            // other explicit HTTP status carry meaning the client relies on.
            if ($e instanceof ValidationException
                || $e instanceof AuthenticationException
                || $e instanceof HttpExceptionInterface) {
                return null;
            }

            // In debug mode fall through to Laravel's detailed error output
            // so developers still see the real cause locally.
            if (config('app.debug')) {
                return null;
            }

            return response()->json([
                'message' => 'Ocorreu um erro inesperado. Tente novamente em instantes.',
                'meta' => [
                    'request_id' => (string) $request->attributes->get('request_id', ''),
                ],
            ], 500);
        });
    })->create();
