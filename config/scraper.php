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

    'allowed_hosts' => array_filter(array_map(
        'trim',
        explode(',', env('SCRAPER_WHITELIST_DOMAINS', 'tudogostoso.com.br,cybercook.com.br,receitas.globo.com'))
    )),

    'timeout' => (int) env('SCRAPER_TIMEOUT', 10),

    'max_response_bytes' => (int) env('SCRAPER_MAX_SIZE', 5 * 1024 * 1024),

];
