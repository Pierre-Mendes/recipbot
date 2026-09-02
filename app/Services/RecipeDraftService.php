<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Stores un-confirmed import drafts in the cache (Redis in production) so a
 * scraped recipe can be reviewed and edited before anything is written to the
 * recipes table. Keyed per user so one user can never read another's draft.
 */
class RecipeDraftService
{
    /**
     * Persist a draft and return its opaque id.
     *
     * @param  array{title: string, ingredients: list<string>, instructions: list<string>, tags: list<string>, source_url: string|null, notes?: string|null}  $data
     */
    public function store(User $user, array $data): string
    {
        $id = (string) Str::uuid();

        Cache::put($this->key($user, $id), $data, now()->addMinutes($this->ttlMinutes()));

        return $id;
    }

    /**
     * Fetch a draft, or null if it never existed or has expired.
     *
     * @return array{title: string, ingredients: list<string>, instructions: list<string>, tags: list<string>, source_url: string|null, notes?: string|null}|null
     */
    public function find(User $user, string $id): ?array
    {
        /** @var array{title: string, ingredients: list<string>, instructions: list<string>, tags: list<string>, source_url: string|null, notes?: string|null}|null $draft */
        $draft = Cache::get($this->key($user, $id));

        return $draft;
    }

    private function key(User $user, string $id): string
    {
        return "recipe_draft:{$user->id}:{$id}";
    }

    private function ttlMinutes(): int
    {
        return (int) config('recipbot.drafts.ttl_minutes', 1440);
    }
}
