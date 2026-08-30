<?php

namespace App\Services;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RecipeSearchService
{
    private const CACHE_TTL_SECONDS = 3600;

    /**
     * Search a user's recipes by tags (AND logic, via the tags GIN index) and/or
     * a free-text query against title + ingredients. Results are cached per
     * user/query for an hour and invalidated whenever that user's recipes change.
     *
     * @param  list<string>  $tags
     * @return array{results: LengthAwarePaginator<int, Recipe>, cache_hit: bool}
     */
    public function search(User $user, array $tags = [], ?string $query = null, int $page = 1, int $perPage = 20): array
    {
        $cacheKey = $this->searchCacheKey($user, $tags, $query, $page, $perPage);
        $store = Cache::tags([$this->userSearchCacheTag($user)]);

        $cacheHit = $store->has($cacheKey);

        $results = $store->remember(
            $cacheKey,
            self::CACHE_TTL_SECONDS,
            fn () => $this->runSearchQuery($user, $tags, $query, $page, $perPage),
        );

        return ['results' => $results, 'cache_hit' => $cacheHit];
    }

    /**
     * @param  list<string>  $tags
     * @return LengthAwarePaginator<int, Recipe>
     */
    private function runSearchQuery(User $user, array $tags, ?string $query, int $page, int $perPage): LengthAwarePaginator
    {
        $builder = $user->recipes()->orderByDesc('created_at');

        if ($tags !== []) {
            $builder->whereRaw('tags @> ?', [json_encode($tags) ?: '[]']);
        }

        $query = $query !== null ? trim($query) : '';

        if ($query !== '') {
            $terms = preg_split('/\s+/', $query) ?: [];

            foreach ($terms as $term) {
                $builder->where(function ($sub) use ($term) {
                    $sub->whereRaw('title ILIKE ?', ["%{$term}%"])
                        ->orWhereRaw('ingredients::text ILIKE ?', ["%{$term}%"]);
                });
            }
        }

        return $builder->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Popular tags for a user, optionally filtered by prefix (autocomplete).
     * The full aggregate is cached for an hour; the prefix filter is applied
     * on the (cheap, already-cached) result rather than re-querying per prefix.
     *
     * @return list<array{name: string, count: int}>
     */
    public function suggestTags(User $user, string $prefix = '', int $limit = 10): array
    {
        $cacheKey = "user:{$user->id}:tags:all";

        /** @var list<array{name: string, count: int}> $allTags */
        $allTags = Cache::tags([$this->userSearchCacheTag($user)])->remember(
            $cacheKey,
            self::CACHE_TTL_SECONDS,
            fn () => $this->aggregateTags($user),
        );

        $prefix = trim($prefix);

        if ($prefix === '') {
            return array_slice($allTags, 0, $limit);
        }

        $prefixLower = mb_strtolower($prefix);

        $filtered = array_values(array_filter(
            $allTags,
            fn (array $tag) => str_starts_with(mb_strtolower($tag['name']), $prefixLower),
        ));

        return array_slice($filtered, 0, $limit);
    }

    /**
     * @return list<array{name: string, count: int}>
     */
    private function aggregateTags(User $user): array
    {
        $rows = DB::table('recipes')
            ->selectRaw('jsonb_array_elements_text(tags) as name, COUNT(*) as count')
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->groupBy('name')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['name' => (string) $row->name, 'count' => (int) $row->count])
            ->all();

        return array_values($rows);
    }

    /**
     * Flush every cached search/suggestion result for a user. Called whenever
     * their recipes change (create/update/delete) so results never go stale.
     */
    public function invalidate(User $user): void
    {
        Cache::tags([$this->userSearchCacheTag($user)])->flush();
    }

    private function userSearchCacheTag(User $user): string
    {
        return "user:{$user->id}:recipes:search";
    }

    /**
     * @param  list<string>  $tags
     */
    private function searchCacheKey(User $user, array $tags, ?string $query, int $page, int $perPage): string
    {
        sort($tags);

        $signature = md5(json_encode([
            'tags' => $tags,
            'query' => $query ?? '',
            'page' => $page,
            'per_page' => $perPage,
        ]) ?: '');

        return "user:{$user->id}:recipes:search:{$signature}";
    }
}
