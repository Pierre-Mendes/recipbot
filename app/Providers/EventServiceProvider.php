<?php

namespace App\Providers;

use App\Events\RecipeCreated;
use App\Events\RecipeDeleted;
use App\Events\RecipeUpdated;
use App\Listeners\InvalidateRecipeSearchCache;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, list<class-string>>
     */
    protected $listen = [
        RecipeCreated::class => [
            InvalidateRecipeSearchCache::class,
        ],
        RecipeUpdated::class => [
            InvalidateRecipeSearchCache::class,
        ],
        RecipeDeleted::class => [
            InvalidateRecipeSearchCache::class,
        ],
    ];
}
