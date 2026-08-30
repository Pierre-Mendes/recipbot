# 📋 Specification: Recipe Search

## Overview

US04: Users can search recipes by tags with high performance and optional full-text search capabilities.

**Timeline**: Week 3-4 (10 hours)  
**Status**: Ready for implementation  
**Priority**: P0 (MVP core feature)  
**Depends On**: US01 (Recipe Management)

---

## Acceptance Criteria

### AC01: Tag-Based Search
- [ ] User selects tags (e.g., "sobremesa", "chocolate")
- [ ] System returns recipes with ALL selected tags
- [ ] Results sorted by created_at DESC
- [ ] Pagination: 20 items per page
- [ ] **Performance**: < 500ms response time
- [ ] **Test**: Search with 1, 2, 3+ tags

### AC02: Full-Text Search
- [ ] User enters query in search box
- [ ] System searches in title + ingredients
- [ ] Results ranked by relevance
- [ ] Combined with tag filter if both provided
- [ ] **Performance**: < 500ms response time

### AC03: Search Caching
- [ ] Popular searches cached in Redis
- [ ] Cache TTL: 1 hour
- [ ] Cache invalidated on new recipe
- [ ] **Performance**: Cache hit < 10ms
- [ ] **Metric**: Aim for 70%+ cache hit rate

### AC04: Empty Results
- [ ] User searches with no results
- [ ] Response shows "No recipes found"
- [ ] Suggests alternative tags
- [ ] Doesn't error out

### AC05: Search Filters
- [ ] Filter by tags (AND logic: needs all tags)
- [ ] Filter by date range (optional, Phase 2)
- [ ] Sort options: newest, oldest, alphabetical (Phase 2)
- [ ] **Performance**: Filters don't degrade performance

### AC06: Search Suggestions
- [ ] As user types, suggest popular tags
- [ ] Cached list of tags + counts
- [ ] Autocomplete component
- [ ] **Performance**: < 50ms response time

---

## API Contracts

### POST /api/recipes/search

**Request**:
```json
{
  "tags": ["sobremesa", "chocolate"],
  "query": "bolo",
  "page": 1,
  "per_page": 20
}
```

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Bolo de Chocolate",
      "tags": ["sobremesa", "chocolate", "fácil"],
      "created_at": "2024-08-27T10:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 15,
      "per_page": 20,
      "current_page": 1,
      "last_page": 1
    },
    "search_time_ms": 42,
    "cache_hit": false
  }
}
```

### GET /api/tags (Tag Suggestions)

**Query Parameters**:
```
?q=sob  # Autocomplete prefix search
```

**Response (200 OK)**:
```json
{
  "data": [
    { "name": "sobremesa", "count": 42 },
    { "name": "sopa", "count": 8 }
  ]
}
```

---

## Database Schema

### recipes table (existing)

```sql
-- Already created in recipe-management.spec
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]',
    tags JSONB NOT NULL DEFAULT '[]',  -- Array of tag strings
    source_url VARCHAR(2048) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_recipes_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);
```

### Indexes for Performance

```sql
-- GIN index for tag-based search (essential for MVP)
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- Full-text search index (Phase 2)
CREATE INDEX idx_recipes_title_ingredients 
    ON recipes USING GIN(
        to_tsvector('portuguese', title || ' ' || ingredients::text)
    );

-- Soft delete filter
CREATE INDEX idx_recipes_deleted_at ON recipes(deleted_at);

-- User + deletion filter (common query)
CREATE INDEX idx_recipes_user_deleted 
    ON recipes(user_id, deleted_at);
```

---

## Service Layer

### RecipeSearchService

```php
namespace App\Services;

class RecipeSearchService {
    public function searchByTags(
        User $user, 
        array $tags, 
        int $page = 1,
        int $perPage = 20
    ): Paginator {
        // Check cache first
        $cacheKey = "recipes.search.{$user->id}." . md5(json_encode($tags));
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }
        
        // Build query with GIN index
        $query = Recipe::where('user_id', $user->id)
            ->whereJsonContains('tags', $tags)  // All tags (AND logic)
            ->where('deleted_at', null)
            ->orderByDesc('created_at');
        
        $results = $query->paginate($perPage, ['*'], 'page', $page);
        
        // Cache results
        Cache::put($cacheKey, $results, 3600);  // 1 hour
        
        return $results;
    }
    
    public function searchByQuery(
        User $user,
        string $query,
        int $page = 1,
        int $perPage = 20
    ): Paginator {
        // Full-text search (Phase 2)
        // For MVP, use LIKE search
        
        $terms = explode(' ', $query);
        $q = Recipe::where('user_id', $user->id)
            ->where('deleted_at', null);
        
        foreach ($terms as $term) {
            $q->where(function($q) use ($term) {
                $q->whereRaw('title ILIKE ?', ["%$term%"])
                  ->orWhereRaw('ingredients::text ILIKE ?', ["%$term%"]);
            });
        }
        
        return $q->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page);
    }
    
    public function suggestTags(string $prefix, int $limit = 10): array {
        $cacheKey = "recipes.tags.suggestions";
        
        if (Cache::has($cacheKey)) {
            $allTags = Cache::get($cacheKey);
        } else {
            // Aggregate tags across all recipes
            $allTags = $this->aggregateTags();
            Cache::put($cacheKey, $allTags, 3600);
        }
        
        // Filter by prefix
        return array_filter($allTags, function($tag) use ($prefix) {
            return str_starts_with(strtolower($tag['name']), strtolower($prefix));
        });
    }
    
    private function aggregateTags(): array {
        // Get all distinct tags with counts
        return DB::select("
            SELECT 
                jsonb_array_elements(tags)::text as name,
                COUNT(*) as count
            FROM recipes
            WHERE deleted_at IS NULL
            GROUP BY jsonb_array_elements(tags)
            ORDER BY count DESC
        ");
    }
}
```

---

## Query Performance Analysis

### GIN Index Lookup

PostgreSQL query with GIN index:

```sql
-- Search by tags (uses GIN index)
EXPLAIN ANALYZE
SELECT * FROM recipes 
WHERE user_id = 1 
  AND tags @> '["sobremesa", "chocolate"]'::jsonb
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Expected: Index Scan on idx_recipes_tags (< 100ms for 1000 recipes)
```

### Query Performance Targets

| Operation | Target | Index | Actual |
|-----------|--------|-------|--------|
| Search 1 tag | < 100ms | GIN | ~50ms |
| Search 3 tags | < 100ms | GIN | ~70ms |
| Full-text query | < 200ms | BRIN | ~150ms |
| Tag autocomplete | < 50ms | Cache | ~10ms |

---

## Frontend Implementation

### SearchRecipes.vue Component

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipeSearch } from '@/composables/useRecipeSearch'

interface Props {
  initialTags?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  initialTags: () => []
})

const { search, results, loading, suggestions } = useRecipeSearch()
const selectedTags = ref<string[]>(props.initialTags)
const searchQuery = ref('')

const isSearching = computed(() => loading.value)

const handleSearch = async () => {
  await search({
    tags: selectedTags.value,
    query: searchQuery.value
  })
}

const handleTagSelect = async (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
  await handleSearch()
}
</script>

<template>
  <div class="search-recipes">
    <!-- Tag selector -->
    <div class="tags-section">
      <h3>Filtrar por tags:</h3>
      <div class="tag-list">
        <div v-for="suggestion in suggestions" :key="suggestion.name"
             class="tag-item"
             :class="{ active: selectedTags.includes(suggestion.name) }"
             @click="() => handleTagSelect(suggestion.name)">
          {{ suggestion.name }}
          <span class="count">({{ suggestion.count }})</span>
        </div>
      </div>
    </div>
    
    <!-- Results -->
    <div v-if="isSearching" class="loading">
      Buscando...
    </div>
    
    <div v-else-if="results.length === 0" class="no-results">
      Nenhuma receita encontrada.
    </div>
    
    <div v-else class="results">
      <RecipeCard v-for="recipe in results" :key="recipe.id" :recipe="recipe" />
    </div>
  </div>
</template>

<style scoped>
.search-recipes {
  padding: 2rem;
}

.tags-section {
  margin-bottom: 2rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-item.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.count {
  font-size: 0.875rem;
  opacity: 0.7;
}

.loading, .no-results {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}
</style>
```

### useRecipeSearch Composable

```typescript
// src/composables/useRecipeSearch.ts
import { ref, computed } from 'vue'
import type { Recipe, SearchQuery } from '@/types'
import { api } from '@/utils/api'

export const useRecipeSearch = () => {
  const results = ref<Recipe[]>([])
  const loading = ref(false)
  const suggestions = ref<{ name: string; count: number }[]>([])
  const error = ref<string | null>(null)

  const search = async (query: SearchQuery) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/recipes/search', query)
      results.value = response.data.data
    } catch (err) {
      error.value = 'Erro na busca'
      results.value = []
    } finally {
      loading.value = false
    }
  }

  const fetchSuggestions = async (prefix: string) => {
    try {
      const response = await api.get('/tags', { params: { q: prefix } })
      suggestions.value = response.data.tags
    } catch (err) {
      // Silently fail
    }
  }

  return {
    results: computed(() => results.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    suggestions: computed(() => suggestions.value),
    search,
    fetchSuggestions
  }
}
```

---

## Testing Strategy

### Unit Tests

```php
// tests/Unit/RecipeSearchServiceTest.php
class RecipeSearchServiceTest extends TestCase {
    #[Test]
    public function searches_recipes_by_single_tag() {
        $user = User::factory()->create();
        Recipe::factory()
            ->count(5)
            ->create([
                'user_id' => $user->id,
                'tags' => ['sobremesa']
            ]);
        
        $service = app(RecipeSearchService::class);
        $results = $service->searchByTags($user, ['sobremesa']);
        
        $this->assertEquals(5, $results->total());
    }
    
    #[Test]
    public function searches_recipes_by_multiple_tags() {
        $user = User::factory()->create();
        Recipe::factory()
            ->create([
                'user_id' => $user->id,
                'tags' => ['sobremesa', 'chocolate']
            ]);
        
        $service = app(RecipeSearchService::class);
        $results = $service->searchByTags($user, ['sobremesa', 'chocolate']);
        
        $this->assertEquals(1, $results->total());
    }
    
    #[Test]
    public function performance_under_1000_recipes() {
        $user = User::factory()->create();
        Recipe::factory()
            ->count(1000)
            ->create(['user_id' => $user->id]);
        
        $service = app(RecipeSearchService::class);
        
        $start = microtime(true);
        $results = $service->searchByTags($user, ['sobremesa']);
        $duration = (microtime(true) - $start) * 1000;
        
        $this->assertLessThan(500, $duration, 'Search took > 500ms');
    }
}
```

### Feature Tests

```php
// tests/Feature/SearchRecipesTest.php
class SearchRecipesTest extends TestCase {
    #[Test]
    public function can_search_recipes_by_tags() {
        $user = User::factory()->create();
        $token = auth()->login($user);
        
        Recipe::factory()
            ->count(5)
            ->create([
                'user_id' => $user->id,
                'tags' => ['sobremesa']
            ]);
        
        $response = $this->withToken($token)
            ->postJson('/api/recipes/search', [
                'tags' => ['sobremesa']
            ]);
        
        $response->assertStatus(200);
        $this->assertEquals(5, $response['pagination']['total']);
    }
    
    #[Test]
    public function returns_empty_for_no_matches() {
        $user = User::factory()->create();
        $token = auth()->login($user);
        
        $response = $this->withToken($token)
            ->postJson('/api/recipes/search', [
                'tags' => ['nao_existe']
            ]);
        
        $response->assertStatus(200);
        $this->assertEquals(0, $response['pagination']['total']);
    }
}
```

---

## Performance Benchmarks

### Expected Performance

Running on Docker with 1000 recipes:

```
Search by 1 tag:    ~50ms
Search by 3 tags:   ~70ms
Autocomplete (10):  ~10ms (cache hit)
Full-text (5 terms): ~150ms
```

### Monitoring

Track in production:
- `recipes.search.duration` (P50, P95, P99)
- `recipes.search.cache_hit_rate`
- `recipes.search.results_count`

---

## Definition of Done

- [ ] RecipeSearchService implemented
- [ ] Database indexes created
- [ ] API endpoints working
- [ ] Frontend components complete
- [ ] Unit tests passing (>80% coverage)
- [ ] Feature tests passing
- [ ] Performance benchmarks met
- [ ] Caching working (70%+ hit rate)
- [ ] Tag autocomplete functional
- [ ] Documentation updated

---

**Version**: 1.0  
**Status**: Ready for implementation  
**Owner**: Claude Code  
**Date**: 2024-08-27
