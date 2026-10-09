<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Recipe Scraper
    |--------------------------------------------------------------------------
    |
    | Domains the recipe scraper is allowed to fetch from, plus the request
    | limits enforced while doing so. The allow-list is a fixed security
    | policy (kept in code — see below); the operational tunables (timeout,
    | size, user agent) stay env-driven since they can vary per environment.
    |
    */

    // SSRF allow-list: the recipe portals the scraper may fetch from. This is a
    // security control, not per-environment configuration, so it lives in code
    // (versioned and reviewed in pull requests) rather than an env var an
    // operator could silently widen on a server. receitas.globo.com redirects
    // its recipes to gshow.globo.com, so both are needed; CyberCook went offline.
    'allowed_hosts' => [
        'tudogostoso.com.br',
        'receitas.globo.com',
        'gshow.globo.com',
    ],

    'timeout' => (int) env('SCRAPER_TIMEOUT', 10),

    'max_response_bytes' => (int) env('SCRAPER_MAX_SIZE', 5 * 1024 * 1024),

    // Recipe portals sit behind CDNs/WAFs that answer 403 to library agents
    // like "GuzzleHttp/7", so the scraper identifies as a regular browser.
    'user_agent' => env(
        'SCRAPER_USER_AGENT',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
    ),

];
