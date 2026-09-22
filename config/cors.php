<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
|--------------------------------------------------------------------------
|
| The SPA and the API are served from different origins (Vite dev server vs.
| the Laravel app, and separate domains in production), so the browser needs
| an explicit allow-list. We never fall back to a wildcard "*": the allowed
| origins come from CORS_ALLOWED_ORIGINS (comma-separated) and, as a
| convenience, from FRONTEND_URL plus the local dev ports. Auth is a JWT sent
| in the Authorization header (not a cookie), so credentialed requests are not
| needed and cookies are never shared cross-origin.
|
*/

$configuredOrigins = array_filter(
    array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))),
    static fn (string $origin): bool => $origin !== '',
);

$defaultOrigins = array_filter([
    env('FRONTEND_URL'),
    'http://localhost:5173',
    'http://localhost:3000',
]);

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_unique(
        $configuredOrigins !== [] ? $configuredOrigins : $defaultOrigins
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
