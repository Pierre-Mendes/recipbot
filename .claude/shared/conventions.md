# Global Conventions & Patterns - Shared Context

## 🔤 Naming Conventions

### PHP (Backend)

```
Classes:        PascalCase (RecipeController)
Methods:        camelCase (getRecipes)
Properties:     camelCase ($recipes)
Functions:      camelCase (formatDate)
Constants:      UPPER_SNAKE_CASE (MAX_RECIPES)
Files:          PascalCase.php (RecipeService.php)
Namespaces:     PascalCase\With\Backslash
```

**Examples:**
```php
class RecipeService { }
public function searchByTags() { }
private $recipes;
const DEFAULT_LIMIT = 15;
function validate_email($email) { }
```

### JavaScript/TypeScript (Frontend)

```
Classes:        PascalCase (RecipeForm)
Functions:      camelCase (fetchRecipes)
Constants:      UPPER_SNAKE_CASE (API_BASE_URL)
Variables:      camelCase (recipes)
Interfaces:     PascalCase (RecipeFormData)
Files:          PascalCase.vue or camelCase.ts
```

**Examples:**
```typescript
class RecipeValidator { }
function fetchRecipes() { }
const API_BASE_URL = 'http://localhost:8000'
const recipes = ref([])
interface RecipeFormData { }
```

### Database

```
Tables:         plural lowercase (recipes, users)
Columns:        snake_case (user_id, created_at)
Indices:        descriptive (idx_user_id, idx_created_at)
Constraints:    fk_table_references (fk_recipes_user_id)
```

---

## 📝 Commit Message Format

### Structure

```
type(scope): description

[optional body]

[optional footer]
```

### Types

```
feat:       new feature
fix:        bug fix
refactor:   refactoring (no behavior change)
test:       adding/updating tests
docs:       documentation only
style:      formatting (prettier, lint)
perf:       performance improvement
ci:         CI/CD changes
chore:      dependencies, tooling
```

### Scopes

```
backend     Laravel code
frontend    Vue code
database    Migrations, seeds
docker      Docker config
testing     Test setup
docs        Documentation
ci          GitHub Actions
```

### Examples

```
feat(backend): add recipe search by tags
fix(frontend): update recipe card after save
refactor(backend): extract search logic to service
test(backend): add unit tests for RecipeService
docs: update API documentation
style(frontend): format RecipeCard component
perf(backend): add GIN index for tags query
ci: add security scanning to workflow
```

### Commit Size

- ✅ **Micro commits** (<400 lines, 1 responsibility)
- ❌ **Giant commits** (>1000 lines)

---

## 🔀 Git Workflow

### Branch Naming

```
Feature:    feat/description-here
Bugfix:     fix/description-here
Refactor:   refactor/description-here
Hotfix:     hotfix/description-here
Test:       test/description-here
Docs:       docs/description-here
```

**Examples:**
```
feat/recipe-export-pdf
fix/ssrf-validation-bypass
refactor/search-service
test/recipe-model
docs/api-documentation
```

### Push Strategy

```bash
1. Create feature branch
   git checkout -b feat/my-feature

2. Make micro commits
   git add app/Services/RecipeService.php
   git commit -m "feat(backend): add search by tags"

3. Push to origin
   git push -u origin feat/my-feature

4. Create PR on GitHub
   (with description + testing notes)

5. Wait for CI/CD
   (all checks must pass)

6. Request review
   (from 1+ team members)

7. Address comments
   git add .
   git commit -m "fix: address review comments"
   git push

8. Merge to main
   (GitHub: create merge commit or squash)
```

---

## 🔍 Code Style

### PHP Code Style (Pint/PSR-12)

```php
// Indentation: 4 spaces
// Line length: max 120 characters
// Classes: opening brace on same line
class RecipeService
{
    // Method declaration
    public function create(array $data): Recipe
    {
        // Implementation
    }
}

// Arrays
$array = [
    'key1' => 'value1',
    'key2' => 'value2',
];

// Spacing
$result = function () {};
if ($condition) {
    // code
}
```

### JavaScript Code Style (Prettier)

```typescript
// Indentation: 2 spaces
// Line length: 80 characters
// Semicolons: yes
// Quotes: single ('') for code
// Quotes: double ("") for HTML

const fetchRecipes = async () => {
  const recipes = await api.get('/recipes')
  return recipes
}

// Objects
const obj = {
  key1: 'value1',
  key2: 'value2',
}

// Arrays
const arr = ['item1', 'item2']
```

---

## 📐 File Organization

### Backend Folder Structure

```
app/
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Requests/
│   └── Resources/
├── Models/
├── Services/
├── Repositories/
├── Events/
├── Listeners/
├── Jobs/
├── Enums/
├── Exceptions/
└── Traits/

tests/
├── Feature/
└── Unit/
```

### Frontend Folder Structure

```
src/
├── components/
│   ├── ui/
│   ├── recipes/
│   └── common/
├── pages/
├── stores/
├── composables/
├── services/
├── types/
├── utils/
├── styles/
├── router/
└── assets/

tests/
├── unit/
├── integration/
└── e2e/
```

---

## 🧪 Testing Patterns

### Backend (Pest)

```php
// Single responsibility
test('can search recipes by tags', function () {
    // Setup
    $recipe = Recipe::factory()->create(['tags' => ['dessert']]);

    // Act
    $results = app(RecipeService::class)->searchByTags(['dessert']);

    // Assert
    expect($results)->toContain($recipe);
});
```

### Frontend (Vitest)

```typescript
// Descriptive names
test('renders recipe title correctly', () => {
  const wrapper = mount(RecipeCard, {
    props: { recipe }
  })
  expect(wrapper.text()).toContain('Bolo de Chocolate')
})
```

---

## 🔐 Security Patterns

### Input Validation

```php
// Always use FormRequest
class StoreRecipeRequest extends FormRequest {
    public function rules(): array {
        return ['title' => 'required|string|max:255'];
    }
}

// In controller
public function store(StoreRecipeRequest $request) {
    Recipe::create($request->validated()); // ✅ Safe
}
```

### Authorization

```php
// Always use policies
$this->authorize('view', $recipe);

// In policy
public function view(User $user, Recipe $recipe): bool {
    return $user->id === $recipe->user_id;
}
```

### Password Hashing

```php
// Always use Hash::make()
User::create([
    'password' => Hash::make($request->password),
]);
```

---

## 📋 Code Review Checklist

Before committing:

```
PHP:
□ Tests passing (php artisan test)
□ PHPStan level 8 (phpstan analyse app/)
□ Pint formatting (pint app/)
□ No dd() or dump()
□ No commented code
□ Type hints everywhere

TypeScript:
□ Tests passing (npm run test)
□ ESLint passing (npm run lint)
□ Prettier format (npm run format)
□ No console.log
□ No any types
□ Props typed

General:
□ Commit message follows format
□ One responsibility per commit
□ <400 lines changed
□ No hardcoded values
□ Documentation updated (if needed)
```

---

## 🚀 Development Workflow

### Daily Routine

```bash
# Morning
git pull origin main
git checkout -b feat/my-feature

# Work (make micro commits)
git add app/Services/MyService.php
git commit -m "feat(backend): implement feature"

# Test
php artisan test
npm run test

# Push
git push -u origin feat/my-feature

# Create PR on GitHub
# Wait for review

# Fix issues (if any)
git add .
git commit -m "fix: address review feedback"
git push
```

### Pre-Push Checklist

```bash
# Backend
php artisan test           # All passing
phpstan analyse app/       # Level 8
pint app/                  # Formatted
composer audit             # No vulnerabilities

# Frontend
npm run test               # All passing
npm run lint               # No errors
npm run format             # Formatted
npm audit                  # No vulnerabilities
```

---

## 📚 Documentation Standards

### Inline Comments

```php
// ✅ Good: explains WHY, not WHAT
// Limit to 100 per page for performance
$recipes = Recipe::limit(100)->get();

// ❌ Bad: obvious from code
// Get recipes
$recipes = Recipe::get();
```

### Function/Method Documentation

```php
/**
 * Search recipes by tags
 * 
 * @param array $tags Array of tag strings
 * @return Collection of matching recipes
 * @throws Exception if tags array is empty
 */
public function searchByTags(array $tags): Collection
{
    return Recipe::whereJsonContains('tags', $tags)->get();
}
```

### README Format

```markdown
# Project Name

## Description
What is this?

## Installation
How to set up?

## Usage
How to use it?

## Testing
How to run tests?

## Deployment
How to deploy?
```

