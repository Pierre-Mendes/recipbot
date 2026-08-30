<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ApiRequestContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) ($request->header('X-Request-Id') ?: (string) str()->uuid());
        $request->attributes->set('request_id', $requestId);

        Log::withContext([
            'request_id' => $requestId,
            'path' => $request->path(),
            'method' => $request->method(),
        ]);

        $start = microtime(true);
        $response = $next($request);
        $durationMs = (int) round((microtime(true) - $start) * 1000);

        $response->headers->set('X-Request-Id', $requestId);

        if ($request->is('api/*') || $request->expectsJson()) {
            try {
                Log::info('api.request.completed', [
                    'request_id' => $requestId,
                    'status' => $response->getStatusCode(),
                    'duration_ms' => $durationMs,
                    'user_id' => optional($request->user())->id,
                    'ip' => $request->ip(),
                ]);
            } catch (Throwable) {
                // Do not block response if logging context fails.
            }
        }

        return $response;
    }
}
