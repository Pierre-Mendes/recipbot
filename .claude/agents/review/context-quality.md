# Code Quality Standards Context - ReviewAgent

## 🎯 Padrões de Qualidade de Código

Este arquivo define os padrões que o CodeStyleChecker valida em todo código RecipBot.

---

## 📊 Coverage Requirements

### Backend (PHP - PHPUnit/Pest)
- **Mínimo:** 80% coverage
- **Objetivo:** 90%+
- **Tipos:**
  - Unit tests (functions/methods)
  - Feature tests (endpoints)
  - Integration tests (services)

**Checklist:**
```
□ Todos endpoints têm tests
□ Services têm unit tests
□ Happy path testado
□ Error cases testado
□ Edge cases testado
□ Coverage report: >80%
```

### Frontend (Vue - Vitest)
- **Mínimo:** 70% coverage
- **Objetivo:** 80%+
- **Tipos:**
  - Component tests
  - Store tests
  - Composable tests
  - Integration tests

**Checklist:**
```
□ Components renderizam
□ Props validam
□ Emits funcionam
□ Stores atualizam
□ Composables retornam
□ Coverage report: >70%
```

---

## 🔍 Static Analysis

### Backend: PHPStan (Level 8)

**Severity Levels:**
```
Level 0: Basic checks
Level 1-4: Standard checks
Level 5-7: Strict checks
Level 8: Strictest (WE USE THIS)
```

**Validações:**
```
✅ Unknown types must use mixed
✅ Properties must have declared types
✅ Methods must have return type
✅ No unused variables
✅ No undefined methods
✅ No undefined properties
✅ Type juggling issues
✅ Unsafe array access
```

**Running:**
```bash
# Full analysis
phpstan analyse app/

# Specific directory
phpstan analyse app/Services/

# Generate baseline
phpstan analyse --generate-baseline

# Check against baseline
phpstan analyse --level max
```

### Frontend: ESLint

**Config (TypeScript):**
```
✅ Strict type checking
✅ No implicit any
✅ No console logs in production
✅ No unused variables
✅ Proper async/await handling
✅ Consistent naming conventions
✅ No dangerous DOM methods
```

**Running:**
```bash
# Check all
npm run lint

# Fix auto-fixable
npm run lint --fix

# Specific file
npm run lint src/components/RecipeCard.vue
```

---

## 🎨 Code Formatting

### Backend: Pint (Laravel Code Style)

**Style:**
- 4 spaces indent
- 120 character line limit
- PSR-12 standard
- Trailing commas in arrays

**Running:**
```bash
# Format all
pint app/

# Check without fixing
pint app/ --test

# Specific file
pint app/Services/RecipeService.php
```

### Frontend: Prettier

**Style:**
- 2 spaces indent
- Single quotes (JavaScript)
- Double quotes (HTML)
- Trailing commas in ES5
- Line width: 80 characters

**Running:**
```bash
# Format all
npm run format

# Check without fixing
npm run format:check

# Specific file
npm run format src/components/RecipeCard.vue
```

---

## 📝 Naming Conventions

### Functions
```
✅ Verb + noun
✅ Descriptive
✅ Not abbreviated

Good:
  fetchRecipes()
  validateEmail()
  transformRecipeData()

Bad:
  getData()
  process()
  fn()
```

### Variables
```
✅ Noun
✅ Lowercase
✅ Meaningful

Good:
  const recipes = []
  const isLoading = false
  const userEmail = 'user@example.com'

Bad:
  const r = []
  const data = false
  const a = 'user@example.com'
```

### Constants
```
✅ UPPER_SNAKE_CASE
✅ Immutable
✅ Global scope

Good:
  const MAX_RECIPES = 100
  const DEFAULT_TIMEOUT = 5000
  const API_BASE_URL = 'http://...'

Bad:
  const MaxRecipes = 100
  const default_timeout = 5000
```

---

## 🔄 Code Patterns

### Services (Business Logic)
```php
✅ Single responsibility
✅ Type-safe parameters
✅ Return types defined
✅ Error handling
✅ Documented with phpdoc

public function searchByTags(array $tags): Collection
{
    return Recipe::whereJsonContains('tags', $tags)->get();
}
```

### Components (Vue)
```vue
✅ Typed props
✅ Proper emits
✅ Reactive state
✅ Computed values
✅ Lifecycle hooks

<script setup lang="ts">
interface Props {
  recipe: Recipe
}

const props = defineProps<Props>()

const emit = defineEmits<{
  deleted: [id: string]
}>()
</script>
```

### Stores (Pinia)
```typescript
✅ Clear actions
✅ Computed helpers
✅ Loading state
✅ Error handling
✅ Type safety

const state = ref<Recipe[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
```

---

## ⚠️ Code Smells

### Backend (PHP)
```
🚩 Long methods (>50 lines)
🚩 Large classes (>300 lines)
🚩 Duplicate code
🚩 God objects
🚩 Too many parameters (>5)
🚩 Nested loops/conditions (>3 levels)
🚩 No type hints
```

### Frontend (Vue)
```
🚩 Long components (>300 lines)
🚩 Props drilling (>3 levels)
🚩 Unused variables
🚩 Console.log in code
🚩 Magic numbers
🚩 Improper async handling
🚩 No error handling
```

---

## 📏 Complexity Metrics

### Cyclomatic Complexity
```
Target: <10 per function/method
Maximum: <15

If higher:
  → Split into smaller functions
  → Extract conditions
  → Use early returns
```

### Lines of Code per Function
```
Backend:
  Target: <30 lines
  Maximum: <50 lines

Frontend:
  Target: <80 lines (component)
  Maximum: <150 lines
```

---

## 🧪 Test Quality

### Unit Tests Should
```
✅ Test ONE behavior
✅ Have clear names (describe what)
✅ Setup → Act → Assert pattern
✅ Use fixtures/factories
✅ Mock dependencies
✅ Be independent
✅ Run fast (<1s each)
```

### Bad Test
```php
public function testRecipe()
{
    $recipe = Recipe::factory()->create();
    // ... multiple assertions
    // ... multiple behaviors
    // unclear what's being tested
}
```

### Good Test
```php
test('can search recipes by tags', function () {
    // Setup
    $recipe = Recipe::factory()->create([
        'tags' => ['dessert', 'chocolate']
    ]);

    // Act
    $results = app(RecipeService::class)
        ->searchByTags(['dessert']);

    // Assert
    expect($results)->toContain($recipe);
});
```

---

## 🔐 Security in Code Quality

### Input Validation
```php
// ❌ Bad
public function store(Request $request)
{
    Recipe::create($request->all());
}

// ✅ Good
public function store(StoreRecipeRequest $request)
{
    Recipe::create($request->validated());
}
```

### SQL Safety
```php
// ❌ Bad - SQL Injection
Recipe::whereRaw("tags LIKE '%{$searchTerm}%'")

// ✅ Good - Parameterized
Recipe::whereJsonContains('tags', $searchTerm)
```

### XSS Prevention
```vue
<!-- ❌ Bad -->
<div v-html="userContent"></div>

<!-- ✅ Good -->
<div>{{ userContent }}</div>
```

---

## 📋 Pre-Commit Checklist

Antes de fazer commit:

```
Backend:
□ Tests passando: php artisan test
□ PHPStan passing: phpstan analyse app/
□ Pint formatting: pint app/
□ No console dumps
□ No commented code
□ Type hints everywhere
□ Phpdoc comments

Frontend:
□ Tests passando: npm run test
□ Lint passing: npm run lint
□ Prettier format: npm run format
□ No console.log
□ No commented code
□ TypeScript strict
□ Props typed

Geral:
□ Commit message seguindo padrão
□ Uma responsabilidade per commit
□ <400 linhas de mudança
□ Não quebra build
```

---

## 🎯 Quality Gates

### Must Pass
```
✅ All tests passing (>80% backend, >70% frontend)
✅ PHPStan level 8
✅ ESLint zero errors
✅ Prettier formatting
✅ No security issues (OWASP)
✅ No performance regressions
```

### Should Pass
```
⚠️ Coverage >85% (backend)
⚠️ Coverage >75% (frontend)
⚠️ No code smells detected
⚠️ Cyclomatic complexity <10
```

### Nice to Have
```
💡 Code comments for complex logic
💡 Descriptive commit messages
💡 Performance optimizations
💡 Documentation updates
```

---

## 🚀 Continuous Improvement

### Weekly Code Reviews
```
□ Check test coverage trends
□ Identify common smells
□ Update patterns/templates
□ Team discussion on improvements
```

### Monthly Metrics
```
□ Average test coverage
□ Bug escape rate
□ Code review time
□ Refactoring days needed
```

---

## 📖 Tools & Documentation

| Tool | Purpose | Command |
|------|---------|---------|
| PHPStan | Static analysis | `phpstan analyse app/` |
| Pint | Code formatter | `pint app/` |
| ESLint | JavaScript linter | `npm run lint` |
| Prettier | Code formatter | `npm run format` |
| Pest | Test runner | `php artisan test` |
| Vitest | Test runner | `npm run test` |

