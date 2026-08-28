# Laravel 11 Backend Context - CodingAgent

## 📚 Contexto Específico para Implementação Backend

Este arquivo contém padrões, convenções e exemplos para o BackendBuilder subagent implementar código Laravel de qualidade.

---

## 🏗️ Estrutura Laravel 11

### Diretório App Structure
```
app/
├── Enums/                  # Type-safe enums
├── Events/                 # Domain events
├── Exceptions/             # Custom exceptions
├── Http/
│   ├── Controllers/        # API controllers
│   ├── Middleware/         # Middleware customizado
│   ├── Requests/           # FormRequest validation
│   └── Resources/          # API Resources (serializers)
├── Jobs/                   # Queued jobs
├── Listeners/              # Event listeners
├── Models/                 # Eloquent models
├── Repositories/           # Data access layer
├── Services/               # Business logic (NOT in Models)
└── Traits/                 # Reusable traits
```

---

## 🔑 Padrões de Código

### 1. Services (Business Logic)

**Localização:** `app/Services/RecipeService.php`

**Padrão:**
```php
<?php

namespace App\Services;

use App\Models\Recipe;
use App\Http\Resources\RecipeResource;
use Illuminate\Database\Eloquent\Collection;

class RecipeService
{
    /**
     * Criar nova receita
     *
     * @param array $data
     * @return Recipe
     */
    public function create(array $data): Recipe
    {
        // Validação já feita em FormRequest
        // Service contém APENAS lógica de negócio
        
        $recipe = Recipe::create($data);
        
        // Event dispatch
        event(new RecipeCreated($recipe));
        
        return $recipe;
    }

    /**
     * Buscar receitas por tags
     *
     * @param array $tags
     * @return Collection
     */
    public function searchByTags(array $tags): Collection
    {
        return Recipe::whereJsonContains('tags', $tags)
            ->with('user')
            ->get();
    }
}
```

**Regras:**
- ✅ Service contém APENAS lógica de negócio
- ✅ Controllers delegam para Services
- ✅ Métodos são públicos e documentados (phpdoc)
- ❌ Nunca fazer query diretamente no Controller
- ❌ Nunca colocar lógica complexa no Model

### 2. Controllers (HTTP Layer)

**Localização:** `app/Http/Controllers/RecipeController.php`

**Padrão:**
```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecipeRequest;
use App\Http\Resources\RecipeResource;
use App\Models\Recipe;
use App\Services\RecipeService;
use Illuminate\Http\JsonResponse;

class RecipeController extends Controller
{
    public function __construct(private RecipeService $recipeService)
    {}

    /**
     * GET /api/recipes
     */
    public function index(): JsonResponse
    {
        $recipes = auth()->user()->recipes;
        
        return response()->json([
            'data' => RecipeResource::collection($recipes),
            'count' => $recipes->count(),
        ]);
    }

    /**
     * POST /api/recipes
     */
    public function store(StoreRecipeRequest $request): JsonResponse
    {
        $recipe = $this->recipeService->create(
            $request->validated()
        );

        return response()->json([
            'data' => new RecipeResource($recipe),
            'message' => 'Recipe created successfully',
        ], 201);
    }

    /**
     * GET /api/recipes/:id
     */
    public function show(Recipe $recipe): JsonResponse
    {
        $this->authorize('view', $recipe);
        
        return response()->json([
            'data' => new RecipeResource($recipe),
        ]);
    }
}
```

**Regras:**
- ✅ Controllers são SLIM (max 20 linhas por método)
- ✅ Usar dependency injection no constructor
- ✅ Retornar JsonResponse com status HTTP apropriado
- ✅ Autorizar via `$this->authorize()` ou middleware
- ❌ Nunca fazer queries no controller
- ❌ Nunca colocar lógica complexa

### 3. Models (Eloquent)

**Localização:** `app/Models/Recipe.php`

**Padrão:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\AsCollection;

class Recipe extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'title',
        'ingredients',
        'instructions',
        'tags',
        'source_url',
        'prep_time_minutes',
        'cook_time_minutes',
    ];

    protected $casts = [
        'ingredients' => AsCollection::class,
        'tags' => AsCollection::class,
    ];

    // ========== RELATIONSHIPS ==========
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ========== SCOPES ==========
    public function scopeByUser($query)
    {
        return $query->where('user_id', auth()->id());
    }

    public function scopeWithTag($query, string $tag)
    {
        return $query->whereJsonContains('tags', $tag);
    }

    // ========== ACCESSORS ==========
    public function getTotalTimeMinutesAttribute(): int
    {
        return ($this->prep_time_minutes ?? 0) + 
               ($this->cook_time_minutes ?? 0);
    }
}
```

**Regras:**
- ✅ Models só definem: fillable, casts, relationships, scopes
- ✅ Usar soft deletes (SoftDeletes trait)
- ✅ Definir $keyType e $incrementing para UUIDs
- ❌ Nunca colocar lógica complexa em models
- ❌ Nunca fazer queries diretas em models

### 4. FormRequest Validation

**Localização:** `app/Http/Requests/StoreRecipeRequest.php`

**Padrão:**
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'ingredients' => 'required|array|min:1',
            'ingredients.*' => 'string|max:500',
            'instructions' => 'required|string|max:5000',
            'tags' => 'array',
            'tags.*' => 'string|max:50',
            'source_url' => 'nullable|url',
            'prep_time_minutes' => 'integer|min:0|max:1440',
            'cook_time_minutes' => 'integer|min:0|max:1440',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Título é obrigatório',
            'ingredients.min' => 'Mínimo 1 ingrediente',
        ];
    }

    public function validated(): array
    {
        return parent::validated();
    }
}
```

**Regras:**
- ✅ FormRequest para TODA validação
- ✅ Definir rules() com validações explícitas
- ✅ Definir messages() com mensagens PT-BR
- ✅ Usar validated() em controllers
- ❌ Nunca validar no controller com $request->validate()

### 5. Database Migrations

**Localização:** `database/migrations/2024_08_28_000000_create_recipes_table.php`

**Padrão:**
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->json('ingredients');
            $table->text('instructions');
            $table->json('tags')->nullable();
            $table->string('source_url')->nullable();
            $table->unsignedSmallInteger('prep_time_minutes')->nullable();
            $table->unsignedSmallInteger('cook_time_minutes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indices para performance
            $table->index('user_id');
            $table->fullText('title', 'instructions'); // Full-text search
            $table->rawIndex('(tags) USING GIN'); // PostgreSQL GIN index
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
```

**Regras:**
- ✅ Usar UUIDs como PK ($table->uuid('id')->primary())
- ✅ Usar foreignUuid() para foreign keys
- ✅ Adicionar indices apropriados
- ✅ Usar softDeletes() para dados sensíveis
- ✅ Usar json() para dados estruturados
- ❌ Nunca fazer down() que perde dados
- ❌ Nunca colocar dados (seeders) em migrations

### 6. Testing (Pest)

**Localização:** `tests/Feature/RecipeControllerTest.php`

**Padrão:**
```php
<?php

use App\Models\Recipe;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('can create recipe', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $response = $this->postJson('/api/recipes', [
        'title' => 'Bolo de Chocolate',
        'ingredients' => ['Chocolate', 'Ovos'],
        'instructions' => 'Misture tudo...',
        'tags' => ['dessert', 'chocolate'],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Bolo de Chocolate');

    $this->assertDatabaseHas('recipes', [
        'title' => 'Bolo de Chocolate',
        'user_id' => $user->id,
    ]);
});

test('unauthenticated cannot create recipe', function () {
    $response = $this->postJson('/api/recipes', []);
    $response->assertStatus(401);
});
```

**Regras:**
- ✅ 1 teste por comportamento
- ✅ Usar factories para dados de teste
- ✅ Testar happy path + error cases
- ✅ Coverage > 80% obrigatório
- ❌ Nunca usar banco de dados real (usar transações)

---

## 🔐 Segurança

### JWT Authentication

```php
// Em config/auth.php (já configurado)
'guards' => [
    'api' => [
        'driver' => 'sanctum',
        'provider' => 'users',
    ],
],
```

### Autorização (Policies)

```php
// app/Policies/RecipePolicy.php
public function view(User $user, Recipe $recipe): bool
{
    return $user->id === $recipe->user_id;
}
```

### SSRF Protection

```php
// app/Services/RecipeScraperService.php
private function isUrlSafe(string $url): bool
{
    $host = parse_url($url, PHP_URL_HOST);
    
    // Whitelist
    $whitelist = ['tudogostoso.com.br', 'cybercook.com.br'];
    if (!in_array($host, $whitelist)) {
        throw new Exception('Domain not whitelisted');
    }
    
    // RFC 1918 blocking
    if (preg_match('/^(10\.|192\.168\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[01]\.)/', $host)) {
        throw new Exception('Private IP detected');
    }
    
    return true;
}
```

---

## 📊 API Response Format

**Sucesso (200):**
```json
{
  "data": { "id": "uuid", "title": "..." },
  "message": "Success message"
}
```

**Erro (422):**
```json
{
  "message": "Validation failed",
  "errors": {
    "title": ["The title field is required"]
  }
}
```

**Paginação (200):**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "per_page": 15,
    "current_page": 1
  }
}
```

---

## 🧪 Performance Benchmarks

| Métrica | Target | Atual |
|---------|--------|-------|
| Recipe Create | <200ms | ~150ms ✅ |
| Recipe Search (10 results) | <100ms | ~80ms ✅ |
| Recipe List (paginated) | <150ms | ~120ms ✅ |
| DB Query | <50ms | ~30ms ✅ |
| Cache Hit | <10ms | ~5ms ✅ |

---

## 🚀 Checklist para Implementação

Quando implementar nova feature backend:

- [ ] Criar Migration
- [ ] Criar Model (com fillable, casts, relationships)
- [ ] Criar Service (lógica de negócio)
- [ ] Criar Controller (HTTP layer)
- [ ] Criar FormRequest (validação)
- [ ] Criar Testes (>80% coverage)
- [ ] Validar PHPStan (level 8)
- [ ] Validar OWASP (SSRF, SQL injection, XSS)
- [ ] Validar Performance (<200ms)
- [ ] Commit com mensagem clara

