# Performance Context - ReviewAgent

## ⚡ Performance Standards & Optimization

Este arquivo define os benchmarks de performance e como otimizar código.

---

## 📊 Performance Targets

### Backend Response Times

```
API Endpoint:       <200ms (99th percentile)
Database Query:     <50ms (simple)
Cache Hit:          <10ms
Batch Operations:   <1s (1000 items)
Large Reports:      <5s (10MB data)
```

### Frontend Performance

```
Page Load:          <3s (first contentful paint)
Component Render:   <100ms per render
Search Results:     <500ms (user input to display)
Image Load:         <1s per image
Navigation:         <200ms between pages
```

### Database Performance

```
Recipe Query:       <100ms (index used)
Search by Tags:     <50ms (GIN index)
Full-text Search:   <200ms (index used)
Aggregations:       <500ms
Joins (2 tables):   <100ms
```

---

## 🗄️ Database Optimization

### Indices Strategy

**Recipes Table:**
```sql
-- Primary key (UUID)
PRIMARY KEY (id)

-- User isolation
INDEX (user_id)

-- Tag search (GIN index for JSON array)
INDEX (tags) USING GIN

-- Title search (full-text)
FULLTEXT INDEX (title, instructions)

-- Soft delete queries
INDEX (deleted_at)

-- Sorting
INDEX (created_at DESC)
```

### Query Optimization

**❌ Bad Query (N+1 Problem):**
```php
$recipes = Recipe::all();
foreach ($recipes as $recipe) {
    echo $recipe->user->name; // Query per recipe!
}
```

**✅ Good Query (Eager Loading):**
```php
$recipes = Recipe::with('user')->get();
foreach ($recipes as $recipe) {
    echo $recipe->user->name; // No extra queries
}
```

### Avoid Common Mistakes

**❌ Bad:**
```php
Recipe::where('created_at', '>', now()->subDays(30))
    ->orderBy('created_at', 'desc')
    ->get()
    ->map(fn($r) => $r->only(['id', 'title'])); // Get all, then filter
```

**✅ Good:**
```php
Recipe::where('created_at', '>', now()->subDays(30))
    ->orderBy('created_at', 'desc')
    ->select('id', 'title')
    ->limit(100)
    ->get(); // Efficient query
```

### Use Pagination

```php
// ❌ Bad - Load all records
$recipes = Recipe::all(); // 1 million rows!

// ✅ Good - Paginate
$recipes = Recipe::paginate(15);

// ✅ Good - Cursor pagination (better for large sets)
$recipes = Recipe::cursorPaginate(15);
```

### Batch Processing

```php
// ❌ Bad - Update one by one
Recipe::all()->each(fn($r) => $r->update(['status' => 'active']));

// ✅ Good - Batch update
Recipe::update(['status' => 'active']);
```

---

## 💾 Caching Strategy

### Redis Cache Configuration

```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'redis'),

'stores' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'prefix' => 'recipbot:',
    ],
],
```

### Cache Patterns

**Cache Results:**
```php
public function searchByTags(array $tags): Collection
{
    $cacheKey = 'recipes:tags:' . implode(',', $tags);
    
    return Cache::remember($cacheKey, 3600, function () use ($tags) {
        return Recipe::whereJsonContains('tags', $tags)->get();
    });
}
```

**Cache Invalidation:**
```php
class Recipe extends Model
{
    protected static function booted(): void
    {
        static::saved(function ($recipe) {
            // Invalidate cache when recipe changes
            Cache::forget('recipes:' . $recipe->id);
            Cache::flush(); // Or be more targeted
        });
    }
}
```

### Cache TTL Strategy

```
User Preferences:   5 minutes
Recipe Search:      1 hour
Tag Suggestions:    24 hours
User Profile:       30 minutes
```

---

## 🚀 Frontend Performance

### Code Splitting

```typescript
// ✅ Lazy load heavy components
const RecipeForm = defineAsyncComponent(() =>
  import('./RecipeForm.vue')
)

// Route lazy loading
{
  path: '/recipes/:id',
  component: () => import('./RecipeDetailPage.vue')
}
```

### Image Optimization

```vue
<!-- ❌ Bad - Full size -->
<img src="recipe-image.jpg" alt="Recipe">

<!-- ✅ Good - Responsive -->
<img 
  :src="recipe.image"
  :alt="recipe.title"
  width="400"
  height="300"
  loading="lazy"
>

<!-- ✅ Better - With srcset -->
<img
  :srcset="`
    ${recipe.image}?w=400 400w,
    ${recipe.image}?w=800 800w,
    ${recipe.image}?w=1200 1200w
  `"
  :alt="recipe.title"
  sizes="(max-width: 600px) 100vw, 800px"
>
```

### Bundle Optimization

```bash
# Analyze bundle size
npm run build
npm run build -- --report

# Tree-shaking enabled
npm run build
```

### Virtual Scrolling for Long Lists

```vue
<!-- Large list: use virtual scrolling -->
<vue-virtual-scroller
  v-slot="{ item }"
  :items="recipes"
  key-field="id"
  :item-size="100"
>
  <RecipeCard :recipe="item" />
</vue-virtual-scroller>
```

---

## ⚡ API Performance

### Response Serialization

**❌ Bad - All relationships:**
```php
return RecipeResource::collection($recipes); // Includes all relations
```

**✅ Good - Selective loading:**
```php
return $recipes->map(fn($r) => [
    'id' => $r->id,
    'title' => $r->title,
    'tags' => $r->tags,
]); // Only needed fields
```

### Compression

```php
// Enable gzip compression
// nginx: gzip on; gzip_types application/json text/javascript;
// Or in middleware
```

### API Rate Limiting

```php
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::post('/recipes', [RecipeController::class, 'store']);
});
```

---

## 🔍 Monitoring & Profiling

### Laravel Telescope (Development)

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate

# Access at /telescope
```

### Query Monitoring

```php
DB::listen(function ($query) {
    if ($query->time > 100) { // > 100ms
        Log::warning('Slow query', [
            'query' => $query->sql,
            'bindings' => $query->bindings,
            'time' => $query->time,
        ]);
    }
});
```

### Frontend Performance Metrics

```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(metric => console.log('CLS:', metric))
getFID(metric => console.log('FID:', metric))
getFCP(metric => console.log('FCP:', metric))
getLCP(metric => console.log('LCP:', metric))
getTTFB(metric => console.log('TTFB:', metric))
```

---

## 🧪 Performance Testing

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/api/recipes

# Using wrk
wrk -t12 -c400 -d30s http://localhost:8000/api/recipes
```

### Backend Benchmarks

```php
test('search performance under load', function () {
    // Setup
    Recipe::factory(1000)->create();

    $startTime = microtime(true);
    
    // Execute
    for ($i = 0; $i < 100; $i++) {
        app(RecipeService::class)->searchByTags(['dessert']);
    }
    
    $elapsed = (microtime(true) - $startTime) / 100;
    
    // Assert
    expect($elapsed)->toBeLessThan(0.05); // <50ms avg
});
```

### Frontend Performance Tests

```typescript
test('component renders fast', async () => {
    const start = performance.now()
    
    mount(RecipeCard, { props: { recipe } })
    
    const end = performance.now()
    
    expect(end - start).toBeLessThan(100) // <100ms
})
```

---

## 📊 Performance Checklist

Before commit:

```
Backend:
□ N+1 queries eliminated (use eager loading)
□ Indices used in WHERE clauses
□ Pagination implemented for lists
□ Cache strategy defined
□ Slow queries logged
□ Response time <200ms

Frontend:
□ Components lazy loaded
□ Images optimized & lazy loaded
□ Unused dependencies removed
□ Bundle size <500KB gzipped
□ Render time <100ms
□ No memory leaks

Database:
□ Appropriate indices added
□ Full-text search optimized
□ Query plans reviewed
□ N+1 issues fixed
□ Partitioning considered if large

General:
□ Monitoring in place
□ Alerts configured
□ Benchmarks met
□ Load test passed
```

---

## 🚀 Performance Optimization Tips

### Quick Wins
1. **Add Missing Indices** (immediate impact)
2. **Eager Load Relations** (simple fix)
3. **Pagination** (instant improvement)
4. **Cache Results** (huge speedup)
5. **Compress Images** (frontend boost)

### Measurement First
```
✅ Profile before optimizing
✅ Identify bottleneck
✅ Make targeted fix
✅ Measure improvement
✅ Move to next bottleneck
```

### 80/20 Rule
```
80% of time spent:
- Database queries
- API serialization
- Frontend rendering

Focus on these first!
```

