<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Holds an analyzed PDF's per-page text between the page-picker step and the
 * moment the user confirms which pages form which recipe - so the file is
 * uploaded and parsed only once. Keyed per user, like import drafts.
 */
class RecipePdfImportStore
{
    /**
     * @param  list<string>  $pages
     */
    public function store(User $user, array $pages): string
    {
        $id = (string) Str::uuid();

        Cache::put($this->key($user, $id), $pages, now()->addMinutes($this->ttlMinutes()));

        return $id;
    }

    /**
     * @return list<string>|null
     */
    public function find(User $user, string $id): ?array
    {
        /** @var list<string>|null $pages */
        $pages = Cache::get($this->key($user, $id));

        return $pages;
    }

    private function key(User $user, string $id): string
    {
        return "recipe_pdf_import:{$user->id}:{$id}";
    }

    private function ttlMinutes(): int
    {
        return (int) config('recipbot.pdf_import.ttl_minutes', 120);
    }
}
