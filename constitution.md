# 📜 RecipBot Constitution - Princípios & Padrões

## 7️⃣ Princípios de Design

### 1. 🎯 User-Centric
**Tudo começa com o usuário final**

- Receitas devem ser fáceis de adicionar (< 2 minutos manual ou 1 clique de link)
- Busca deve ser intuitiva (tags simples, sem queries complexas)
- Interface limpa, sem distrações
- Feedback visual claro (loading, sucesso, erro)

✅ **Verificação**:
```
- Pode adicionar receita em menos de 2 minutos?
- Consegue encontrar receita por tag em <1 segundo?
- UI é responsiva em mobile?
```

---

### 2. 🔧 Stack-Agnostic
**Decisões de stack são secundárias; arquitetura é primária**

- Banco de dados? PostgreSQL (mas poderia ser MySQL)
- Cache? Redis (mas poderia ser Memcached)
- Queue? Redis (mas Kafka para Phase 2)
- Frontend? Vue 3 (mas poderia ser React)

✅ **Implementação**:
```
app/Repositories/RecipeRepository.php (abstração)
↓
Pode trocar de Eloquent para Query Builder sem quebrar Controllers
```

---

### 3. 🤖 AI-First (quando $0)
**Use IA onde não custa; evite onde custa**

- ❌ OCR? Não (Gemini Vision = $2.50/100k, Phase 2)
- ✅ Web Scraper? Sim (0 cost, HTML parsing local)
- ✅ Tag Suggestions? Futuro (vector search PostgreSQL, 0 cost)
- ✅ Manual + Link? Sim (custo zero, escalável)

---

### 4. 🔐 Security & Privacy (OWASP)
**Sem segurança, nada funciona**

- Autenticação: JWT 1h (não cookies)
- Autorização: recipe.owner middleware
- Validação: sempre, frontend + backend
- SSRF Protection: whitelist + RFC1918 block
- Logs: user_id, ip, timestamp (nunca passwords)

---

### 5. ✅ Quality Standards
**Código sem testes é código quebrado**

- Testes: >80% coverage backend, >70% frontend
- Code Quality: PHPStan level 8, ESLint zero errors
- Linting: Pint (Laravel), Prettier (Vue)
- Types: Strict TypeScript, Type-safe Enums

---

### 6. ⚡ Performance
**Rápido é melhor que certo**

- Search: <500ms (use GIN index PostgreSQL)
- Page load: <2s (lazy load components)
- API response: <200ms (paginate, cache)
- Database: N+1 queries é crime

---

### 7. 📈 Scalability
**MVP hoje, 1M usuários amanhã**

- Event-Driven: RecipeCreated → handlers (Search, Cache, etc)
- DDD: Bounded contexts (Recipe, Ingestion, Search, Nutrition)
- Repository Pattern: swap banco de dados sem quebrar app
- Async Jobs: queue heavy operations (scraping, embedding)

---

## 🛠️ Padrões de Implementação

### Backend (Laravel)

#### Models
```php
// ✅ BOM
class Recipe extends Model {
    use SoftDeletes; // sempre soft delete
    
    protected $casts = [
        'ingredients' => 'array', // JSON
        'tags' => 'array',
        'created_at' => 'datetime',
    ];
    
    protected $fillable = ['title', 'ingredients', 'tags'];
    
    // ✅ Sempre definir regras
    public static function rules(): array {
        return [
            'title' => 'required|string|max:255',
            'ingredients' => 'array|max:20',
            'tags' => 'array|max:10',
        ];
    }
}

// ❌ RUIM
class Recipe extends Model {
    public $timestamps = false; // nunca desative
    protected $fillable = ['*']; // mass assignment disaster
}
```

#### Services
```php
// ✅ BOM - Camada de negócio separada
class RecipeService {
    public function __construct(
        private RecipeRepository $repository,
        private ScraperService $scraper,
        private EventPublisher $events,
    ) {}
    
    public function createFromUrl(string $url, array $tags): Recipe {
        $extracted = $this->scraper->extract($url);
        $recipe = $this->repository->create([
            'title' => $extracted['title'],
            'ingredients' => $extracted['ingredients'],
            'tags' => $tags,
            'source_url' => $url,
        ]);
        
        $this->events->publish(new RecipeCreated($recipe));
        return $recipe;
    }
}

// ❌ RUIM - Lógica em Controller
class RecipeController {
    public function store(Request $request) {
        // 100 linhas de scraping + validação + save
    }
}
```

#### Form Requests
```php
// ✅ BOM - Validação centralizada
class StoreRecipeRequest extends FormRequest {
    public function rules(): array {
        return [
            'title' => 'required|string|max:255',
            'ingredients' => 'required|array|max:20',
            'ingredients.*' => 'string|max:255',
            'tags' => 'array|max:10',
            'tags.*' => 'string|max:50',
            'source_url' => 'nullable|url',
        ];
    }
}
```

#### Jobs (Async)
```php
// ✅ BOM - Operações lentas em queue
class GenerateRecipeEmbeddingJob implements ShouldQueue {
    public function handle(EmbeddingService $service) {
        $vector = $service->generate($this->recipe->title);
        $this->recipe->update(['embedding' => $vector]);
    }
}

// Disparo: RecipeCreated::dispatch($recipe);
```

#### Event-Driven
```php
// Event
class RecipeCreated {
    public function __construct(public Recipe $recipe) {}
}

// Listeners
class UpdateSearchIndexListener {
    public function handle(RecipeCreated $event) {
        SearchIndex::add($event->recipe);
    }
}

class InvalidateCacheListener {
    public function handle(RecipeCreated $event) {
        Cache::forget('recipes.tags');
    }
}

class GenerateEmbeddingListener {
    public function handle(RecipeCreated $event) {
        GenerateRecipeEmbeddingJob::dispatch($event->recipe);
    }
}

// Registro em EventServiceProvider
protected $listen = [
    RecipeCreated::class => [
        UpdateSearchIndexListener::class,
        InvalidateCacheListener::class,
        GenerateEmbeddingListener::class,
    ],
];
```

#### Tests
```php
// ✅ BOM
class RecipeTest extends TestCase {
    #[Test]
    public function creates_recipe_with_valid_data() {
        $recipe = Recipe::factory()->create([
            'title' => 'Bolo de Chocolate',
        ]);
        
        $this->assertEquals('Bolo de Chocolate', $recipe->title);
    }
    
    #[Test]
    public function rejects_recipe_without_user() {
        $this->expectException(ValidationException::class);
        
        Recipe::create(['title' => 'Test']);
    }
}
```

---

### Frontend (Vue 3)

#### Components
```vue
<!-- ✅ BOM - Props + Emits tipados -->
<script setup lang="ts">
interface Props {
  recipe: Recipe;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  'update:recipe': [recipe: Recipe];
  'delete': [];
}>();

const onDelete = () => emit('delete');
</script>

<template>
  <div class="recipe-card">
    <h2>{{ recipe.title }}</h2>
    <button @click="onDelete">Deletar</button>
  </div>
</template>
```

#### Stores (Pinia)
```typescript
// ✅ BOM - Setup syntax
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useRecipeStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([])
  const loading = ref(false)
  
  const byTag = computed(() => (tag: string) => {
    return recipes.value.filter(r => r.tags.includes(tag))
  })
  
  const fetch = async () => {
    loading.value = true
    recipes.value = await api.getRecipes()
    loading.value = false
  }
  
  return { recipes, loading, byTag, fetch }
})
```

#### Composables
```typescript
// ✅ BOM - Lógica reutilizável
export const useRecipeSearch = () => {
  const query = ref('')
  const results = ref<Recipe[]>([])
  const loading = ref(false)
  
  const search = async (tags: string[]) => {
    loading.value = true
    results.value = await api.search({ tags })
    loading.value = false
  }
  
  return { query, results, loading, search }
}

// Uso em components
const { results, search } = useRecipeSearch()
```

#### Types
```typescript
// ✅ BOM - Tipos centralizados
export interface Recipe {
  id: string
  userId: string
  title: string
  ingredients: string[]
  tags: string[]
  sourceUrl?: string
  createdAt: string
}

export interface SearchQuery {
  tags: string[]
  limit?: number
  offset?: number
}

export type RecipeStatus = 'draft' | 'published' | 'archived'
```

#### Testing
```typescript
// ✅ BOM - Teste componentes isolados
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeCard from '@/components/RecipeCard.vue'

describe('RecipeCard', () => {
  it('renders recipe title', () => {
    const recipe = { id: '1', title: 'Bolo' }
    const wrapper = mount(RecipeCard, {
      props: { recipe }
    })
    
    expect(wrapper.text()).toContain('Bolo')
  })
})
```

---

### Database (PostgreSQL)

#### Migrations
```php
// ✅ BOM
Schema::create('recipes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title', 255);
    $table->jsonb('ingredients'); // Array de strings
    $table->jsonb('tags'); // Array de tags
    $table->string('source_url')->nullable();
    $table->softDeletes(); // ✅ Sempre soft delete
    $table->timestamps();
    
    $table->index('user_id'); // Foreign key já é indexado
    $table->fullText(['title', 'ingredients']); // Full-text search
});

// ✅ Index otimizado para busca por tags
Schema::table('recipes', function (Blueprint $table) {
    $table->index('tags', 'idx_recipes_tags'); // GIN em PostgreSQL
});

// ❌ RUIM
Schema::create('recipes', function (Blueprint $table) {
    $table->increments('id'); // UUID é melhor
    $table->string('title'); // Sem limite de caracteres = bug
    // Sem timestamps! Impossível auditar
});
```

#### Queries
```php
// ✅ BOM - Use ORM, não raw SQL
$recipes = Recipe::where('user_id', auth()->id())
    ->whereJsonContains('tags', 'sobremesa')
    ->with('user') // Eager load, não N+1
    ->paginate(20);

// ✅ BOM - Query otimizado com GIN index
$recipes = Recipe::where('user_id', auth()->id())
    ->where('tags', '@>', json_encode(['chocolate', 'sobremesa']))
    ->orderByDesc('created_at')
    ->get();

// ❌ RUIM - N+1 query
foreach($recipes as $recipe) {
    echo $recipe->user->name; // Query por cada recipe!
}

// ❌ RUIM - Raw SQL
DB::select("SELECT * FROM recipes WHERE user_id = ?", [auth()->id()]);
```

---

## 🔄 Workflow Diário

### Morning Check
```bash
# 1. Código qualidade
phpstan analyse app/
npm run lint

# 2. Testes
php artisan test
npm run test

# 3. Database
php artisan migrate --fresh --seed
psql -h localhost -U postgres -d recipbot -c "\dt"

# 4. App health
curl http://localhost:8000/health
curl http://localhost:5173
```

### Before Push
```bash
# 1. Testes com coverage
php artisan test --coverage
npm run test:coverage

# 2. Fix linting
pint                    # Backend
npm run format          # Frontend

# 3. Commit
git add .
git commit -m "feat: add recipe search"

# 4. Push
git push origin feature/recipe-search
```

---

## 🚫 Coisas que NÃO fazer

| ❌ NÃO | ✅ SIM | Porquê |
|--------|--------|--------|
| `$fillable = ['*']` | `$fillable = ['title', 'tags']` | Previne mass assignment |
| Timestamps desativados | Sempre com timestamps | Auditoria + debug |
| `update($data)` sem validar | FormRequest em Controller | Validação centralizada |
| N+1 queries | Eager load with() | Performance |
| Diretamente no Controller | Services layer | Reutilização + testes |
| `any` types | TypeScript strict | Erros em compile-time |
| SQL bruto | Eloquent ORM | SQL injection protection |
| Hard delete | Soft delete | GDPR + recovery |
| Sem testes | >80% coverage | Refactoring seguro |
| API sem versioning | /api/v1/ + /api/v2/ | Backward compatibility |

---

## ✅ Checklist de PR

Antes de fazer merge:

- [ ] Testes passando (>80% coverage)
- [ ] Code quality OK (PHPStan + ESLint zero errors)
- [ ] Migrations testadas localmente
- [ ] OWASP validado (se toca security)
- [ ] TypeScript sem any
- [ ] Componentes Vue com props/emits tipados
- [ ] Services layer, não controller logic
- [ ] Database indexes para queries novas
- [ ] Soft deletes para entidades sensíveis
- [ ] Documentação atualizada

---

**Versão**: 1.0  
**Status**: Pronto para desenvolvimento  
**Último Update**: 2024-08-27
