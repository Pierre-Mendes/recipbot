<?php

namespace App\Listeners;

use App\Events\RecipeCreated;
use App\Events\RecipeDeleted;
use App\Events\RecipeUpdated;
use App\Services\RecipeSearchService;

class InvalidateRecipeSearchCache
{
    public function __construct(
        private readonly RecipeSearchService $search,
    ) {}

    public function handle(RecipeCreated|RecipeUpdated|RecipeDeleted $event): void
    {
        $this->search->invalidate($event->user);
    }
}
