<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::prefix('docs')->group(function () {
    Route::get('/', function () {
        abort_if(app()->isProduction(), 404);

        return view('swagger');
    });

    Route::get('/openapi.yaml', function () {
        abort_if(app()->isProduction(), 404);

        return response()->file(base_path('docs/openapi.yaml'), [
            'Content-Type' => 'application/yaml; charset=UTF-8',
        ]);
    });
});
