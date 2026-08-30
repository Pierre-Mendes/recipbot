# Architecture Context - AnalysisAgent

## 🏗️ System Architecture

Este arquivo descreve a arquitetura completa do RecipBot MVP.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (Vue 3 + TypeScript)          │
│  ├─ Components (RecipeForm, RecipeCard, etc)   │
│  ├─ Stores (Pinia - auth, recipes)             │
│  ├─ Services (API clients)                      │
│  └─ Pages (Home, Recipes, Search, Profile)     │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/REST API (JSON)
                   │
┌──────────────────▼──────────────────────────────┐
│       Backend (Laravel 11 + PHP 8.2)            │
│  ├─ Controllers (HTTP layer)                    │
│  ├─ Services (Business logic)                   │
│  ├─ Models (Data models)                        │
│  ├─ Database (PostgreSQL)                       │
│  └─ Cache (Redis)                               │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   ┌────▼──┐  ┌───▼────┐  ┌─▼──────┐
   │  DB   │  │ Redis  │  │ Queue  │
   │ PG16  │  │ Cache  │  │ Jobs   │
   └───────┘  └────────┘  └────────┘
```

---

## 🗄️ Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,      -- bcrypt hashed
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL,            -- soft delete
    
    INDEX (email),
    INDEX (deleted_at)
);
```

#### Recipes Table
```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,                -- foreign key
    title VARCHAR(255) NOT NULL,
    ingredients JSON NOT NULL,            -- array of strings
    instructions TEXT NOT NULL,
    tags JSON NOT NULL DEFAULT '[]',      -- array of strings
    source_url VARCHAR(255) NULL,
    prep_time_minutes SMALLINT NULL,
    cook_time_minutes SMALLINT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL,            -- soft delete
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX (user_id),
    INDEX (created_at DESC),
    INDEX (deleted_at),
    FULLTEXT INDEX (title, instructions),
    INDEX (tags) USING GIN                -- PostgreSQL GIN for JSON array
);
```

#### Personal Access Tokens (Laravel Sanctum)
```sql
-- Laravel creates this automatically
-- Stores JWT tokens for API auth
```

---

## 🔄 Data Flow

### Create Recipe Flow
```
1. User submits form (frontend)
   ↓
2. POST /api/recipes (Vue3 → Laravel)
   ↓
3. FormRequest validation
   ↓
4. RecipeService::create()
   ├─ Validates data
   ├─ Creates Recipe model
   └─ Fires RecipeCreated event
   ↓
5. Event listener invalidates cache
   ↓
6. Response with JSON (Recipe resource)
   ↓
7. Frontend updates Pinia store
   ↓
8. Component re-renders with new recipe
```

### Search Flow
```
1. User enters tags/query (frontend)
   ↓
2. GET /api/recipes/search (with params)
   ↓
3. RecipeSearchService::search()
   ├─ Check cache (Redis)
   ├─ If hit: return cached results
   ├─ If miss:
   │   ├─ Query database (GIN index)
   │   ├─ Cache results (1h TTL)
   │   └─ Return results
   ↓
4. Response with JSON array
   ↓
5. Frontend updates Pinia store
   ↓
6. Component renders search results
```

---

## 🔐 Authentication & Authorization

### JWT Authentication (Sanctum)

```
Login Request:
  ↓
  ├─ Validate email/password
  ├─ Hash password comparison
  └─ Generate JWT token (1h expiration)
  ↓
Response: { access_token, token_type: 'Bearer', expires_in: 3600 }
  ↓
Frontend stores in memory (or HTTP-only cookie if needed)
  ↓
All subsequent requests:
  ├─ Include: Authorization: Bearer {token}
  └─ Backend validates token
  ↓
If valid: Process request with Auth::user()
If invalid: Return 401 Unauthorized
```

### Authorization Policies

```php
RecipePolicy:
├─ view(user, recipe) → user.id === recipe.user_id
├─ update(user, recipe) → user.id === recipe.user_id
└─ delete(user, recipe) → user.id === recipe.user_id

UserPolicy:
├─ update(user, target) → user.id === target.id
└─ delete(user, target) → user.id === target.id
```

---

## 📡 API Layer

### Response Format (Standard)

**Success (200):**
```json
{
  "data": {
    "id": "uuid",
    "title": "...",
    "ingredients": [...]
  },
  "message": "Recipe created successfully"
}
```

**Error (422):**
```json
{
  "message": "Validation failed",
  "errors": {
    "title": ["The title field is required"]
  }
}
```

**Unauthorized (401):**
```json
{
  "message": "Unauthorized"
}
```

### Error Handling

```php
try {
    // Business logic
} catch (ValidationException $e) {
    return response()->json([
        'message' => 'Validation failed',
        'errors' => $e->errors()
    ], 422);
} catch (Exception $e) {
    Log::error('Exception', ['error' => $e]);
    return response()->json([
        'message' => 'Internal server error'
    ], 500);
}
```

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App.vue (root)
├─ Router (Vue Router)
│  ├─ HomePage
│  │  ├─ Header
│  │  ├─ Hero Section
│  │  └─ Recent Recipes
│  ├─ RecipesPage
│  │  ├─ RecipeList
│  │  │  └─ RecipeCard (repeated)
│  │  └─ Pagination
│  ├─ SearchPage
│  │  ├─ SearchBar
│  │  └─ SearchResults
│  │     └─ RecipeCard (repeated)
│  ├─ RecipeDetailPage
│  │  ├─ RecipeDetail
│  │  ├─ Edit Button
│  │  └─ Delete Button
│  ├─ RecipeFormPage
│  │  └─ RecipeForm
│  └─ ProfilePage
│     ├─ ProfileInfo
│     └─ Settings
└─ Footer
```

### State Management (Pinia)

```typescript
authStore:
├─ State
│  ├─ user (User | null)
│  ├─ token (string | null)
│  └─ isAuthenticated (boolean)
├─ Actions
│  ├─ login(email, password)
│  ├─ register(email, password, name)
│  ├─ logout()
│  └─ refreshToken()
└─ Getters
   ├─ isAuthenticated
   └─ currentUser

recipesStore:
├─ State
│  ├─ recipes (Recipe[])
│  ├─ isLoading (boolean)
│  └─ error (string | null)
├─ Actions
│  ├─ fetchRecipes()
│  ├─ createRecipe(data)
│  ├─ updateRecipe(id, data)
│  ├─ deleteRecipe(id)
│  └─ searchRecipes(query)
└─ Getters
   ├─ recipeCount
   └─ recipesById
```

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
├─ Docker Compose
│  ├─ app (Laravel, port 8000)
│  ├─ frontend (Vue3, port 5173)
│  ├─ postgres (port 5432)
│  ├─ redis (port 6379)
│  └─ adminer (port 8080)
└─ Git (local)
```

### Staging
```
AWS/Heroku
├─ App Server (Laravel, Heroku dyno)
├─ Database (AWS RDS PostgreSQL)
├─ Cache (Redis on Heroku)
├─ Frontend (Vercel or Netlify)
└─ CI/CD (GitHub Actions)
```

### Production (Future)
```
Supabase (PostgreSQL + Auth + Realtime)
├─ Database (PostgreSQL 16)
├─ Auth (JWT via Supabase Auth)
├─ Storage (S3-compatible)
├─ Edge Functions (for serverless)
└─ Frontend (Vercel, Netlify, or Cloudflare)
```

---

## ⚙️ Service Layers

### Backend Services

#### RecipeService
```php
class RecipeService {
    public function create(array $data): Recipe
    public function update(string $id, array $data): Recipe
    public function delete(string $id): void
    public function getById(string $id): Recipe
    public function getUserRecipes(User $user): Collection
}
```

#### RecipeSearchService
```php
class RecipeSearchService {
    public function searchByTags(array $tags): Collection
    public function searchByQuery(string $query): Collection
    public function suggestTags(string $query): array
}
```

#### RecipeScraperService
```php
class RecipeScraperService {
    public function scrapeUrl(string $url): array
    private function isUrlSafe(string $url): bool
    private function extractRecipeData(string $html): array
}
```

### Frontend Services

#### RecipeService (API Client)
```typescript
class RecipeService {
    async getAll(): Promise<Recipe[]>
    async getById(id: string): Promise<Recipe>
    async create(data: RecipeFormData): Promise<Recipe>
    async update(id: string, data: RecipeFormData): Promise<Recipe>
    async delete(id: string): Promise<void>
    async search(query: string): Promise<Recipe[]>
    async scrapeUrl(url: string): Promise<Recipe>
}
```

#### AuthService (API Client)
```typescript
class AuthService {
    async register(data: RegisterData): Promise<AuthResponse>
    async login(data: LoginData): Promise<AuthResponse>
    async logout(): Promise<void>
    async refreshToken(): Promise<AuthResponse>
    async getCurrentUser(): Promise<User>
}
```

---

## 📊 Database Performance

### Indices Strategy

| Index | Type | Purpose |
|-------|------|---------|
| users(id) | PRIMARY | Primary key |
| recipes(id) | PRIMARY | Primary key |
| recipes(user_id) | BTREE | User isolation |
| recipes(created_at DESC) | BTREE | Sorting |
| recipes(tags) | GIN | Tag search |
| recipes(title, instructions) | FULLTEXT | Full-text search |
| recipes(deleted_at) | BTREE | Soft delete filter |

### Query Optimization

```
Tag Search (GIN index):
  WHERE tags @> '["dessert"]'  → <50ms ✅

Full-text Search:
  WHERE MATCH(title, instructions)  → <200ms ✅

User Isolation:
  WHERE user_id = 'uuid'  → <10ms ✅

Pagination:
  LIMIT 15 OFFSET 0  → <100ms ✅
```

---

## 🔄 Caching Strategy

### Cache Layers

```
Request
  ↓
  ├─ Browser Cache (images, static)
  ├─ HTTP Cache (API responses)
  └─ Application Cache (Redis)
      ├─ Tag suggestions (24h)
      ├─ Search results (1h)
      └─ User recipes (30min)
  ↓
  ├─ ORM Cache (Eloquent)
  └─ Database Query Cache
      ├─ Indices (GIN, BTREE)
      └─ Query plans
```

### Cache Invalidation

```php
Recipe::saved(function ($recipe) {
    // Invalidate on create/update
    Cache::flush();  // Or targeted:
    Cache::forget('recipes:' . $recipe->id);
    Cache::forget('user:' . $recipe->user_id . ':recipes');
});

Recipe::deleted(function ($recipe) {
    // Invalidate on delete
    Cache::forget('recipes:' . $recipe->id);
});
```

---

## 🧪 Testing Architecture

### Unit Tests
```
Backend:
  app/Services/RecipeService.php
  app/Http/Requests/StoreRecipeRequest.php
  app/Models/Recipe.php

Frontend:
  src/stores/recipesStore.ts
  src/composables/useRecipes.ts
  src/components/RecipeCard.vue
```

### Feature Tests
```
Backend:
  POST /api/recipes (create)
  PUT /api/recipes/:id (update)
  DELETE /api/recipes/:id (delete)
  GET /api/recipes/search (search)

Frontend:
  Component rendering
  Store mutations
  API calls
```

### E2E Tests
```
Playwright Suite:
  1. User registration
  2. Recipe creation
  3. Recipe search
  4. Recipe detail
  5. Recipe deletion
  6. Logout
```

---

## 📈 Scalability Considerations

### Horizontal Scaling

```
Load Balancer
  ├─ App Server 1
  ├─ App Server 2
  └─ App Server N

Shared Resources:
  ├─ PostgreSQL (read replicas)
  ├─ Redis (cluster)
  └─ File Storage (S3)
```

### Database Optimization

```
For 1M recipes:
  - Partition by user_id
  - Archive old recipes
  - Optimize indices
  - Use connection pooling
  - Read replicas for search
```

### Frontend Optimization

```
- CDN for static assets
- Code splitting per route
- Image optimization (WebP, AVIF)
- Service Worker for offline
- Database replication
```

