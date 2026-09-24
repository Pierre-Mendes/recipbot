<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Recipe Scraper
    |--------------------------------------------------------------------------
    |
    | Domains the recipe scraper is allowed to fetch from, and the request
    | limits enforced while doing so. Keeping these in config/env (rather
    | than hardcoded in SsrfGuard/RecipeScraperService) lets the whitelist
    | differ per environment without a code change.
    |
    */

    // receitas.globo.com now redirects its recipes to gshow.globo.com, so
    // both are needed for Globo links to import. CyberCook went offline.
    'allowed_hosts' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('SCRAPER_WHITELIST_DOMAINS', 'tudogostoso.com.br,receitas.globo.com,gshow.globo.com'))
    ))),

    'timeout' => (int) env('SCRAPER_TIMEOUT', 10),

    'max_response_bytes' => (int) env('SCRAPER_MAX_SIZE', 5 * 1024 * 1024),

    // Recipe portals sit behind CDNs/WAFs that answer 403 to library agents
    // like "GuzzleHttp/7", so the scraper identifies as a regular browser.
    'user_agent' => env(
        'SCRAPER_USER_AGENT',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
    ),

];
