<?php

namespace App\Events;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RecipeCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Recipe $recipe,
        public User $user,
    ) {}
}
