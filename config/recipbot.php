<?php

return [
    'tracks' => [
        'reliability' => [
            'api_p95_latency_ms' => (int) env('TARGET_API_P95_LATENCY_MS', 200),
            'frontend_error_rate_percent' => (float) env('TARGET_FRONTEND_ERROR_RATE_PERCENT', 1.0),
        ],
        'ux' => [
            'search_feedback_p95_ms' => (int) env('TARGET_SEARCH_FEEDBACK_P95_MS', 500),
        ],
        'security' => [
            'high_open_vulnerabilities' => (int) env('TARGET_HIGH_OPEN_VULNERABILITIES', 0),
            'secret_leaks' => (int) env('TARGET_SECRET_LEAKS', 0),
        ],
        'delivery_speed' => [
            'ci_required_lane_p95_minutes' => (int) env('TARGET_CI_REQUIRED_LANE_P95_MINUTES', 15),
            'release_frequency_per_week' => (int) env('TARGET_RELEASES_PER_WEEK', 1),
        ],
    ],
    'pagination' => [
        'recipes_default_per_page' => (int) env('RECIPES_DEFAULT_PER_PAGE', 20),
        'recipes_max_per_page' => (int) env('RECIPES_MAX_PER_PAGE', 100),
        'tags_default_limit' => (int) env('TAGS_DEFAULT_LIMIT', 10),
        'tags_max_limit' => (int) env('TAGS_MAX_LIMIT', 25),
    ],

    /*
    | Import drafts are the un-saved result of extracting a recipe from a URL
    | (later: photo/PDF). They live in the cache store (Redis in production)
    | until the user reviews and confirms them, so nothing is persisted to the
    | recipes table before the user approves it.
    */
    'drafts' => [
        'ttl_minutes' => (int) env('RECIPE_DRAFT_TTL_MINUTES', 1440),
    ],
];
