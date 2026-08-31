# 📋 Specification: Recipe Management

## Overview

US01 + US02: Users can create, read, update, and delete recipes with manual input, URL ingestion, and web scraping support.

**Timeline**: Week 1-3 (20 hours)  
**Status**: Ready for implementation  
**Priority**: P0 (MVP blocker)

---

## Acceptance Criteria

### AC01: Manual Recipe Creation
- [ ] User clicks "Create Recipe" → form appears
- [ ] Form has: Title, Ingredients (array), Tags (multi-select)
- [ ] Submit → Recipe saved to database
- [ ] User redirected to recipe detail view
- [ ] **Performance**: Form submission < 1 second

### AC02: URL Ingestion
- [ ] User pastes URL → System extracts recipe
- [ ] Supports: tudogostoso.com.br, cybercook.com.br, receitas.globo.com
- [ ] Extraction: Title, Ingredients, Instructions (if available)
- [ ] User can edit extracted data before saving
- [ ] **Performance**: Extraction < 10 seconds, timeout safety
- [ ] **Security**: SSRF protection (whitelist + RFC1918 block)

### AC03: Recipe View
- [ ] GET /api/recipes/{id} returns recipe
- [ ] Only recipe owner can view
- [ ] Response includes: title, ingredients, tags, source_url, created_at
- [ ] **Performance**: < 200ms response time

### AC04: Recipe Update
- [ ] PATCH /api/recipes/{id} updates recipe
- [ ] Only recipe owner can update
- [ ] Can update: title, ingredients, tags
- [ ] Cannot update: user_id, created_at
- [ ] Validation rules apply same as create
- [ ] **Performance**: < 500ms response time

### AC05: Recipe Delete (Soft Delete)
- [ ] DELETE /api/recipes/{id} soft-deletes recipe
- [ ] Only recipe owner can delete
- [ ] Recipe still in database but marked as deleted
- [ ] Soft-deleted recipes don't appear in lists
- [ ] User can restore deleted recipes (Phase 2)
- [ ] **Performance**: < 200ms response time

---

## API Contracts

### POST /api/recipes (Create Manual)

**Request**:
```json
{
  "title": "Bolo de Chocolate",
  "ingredients": [
    "2 xícaras de farinha",
    "1 xícara de açúcar",
    "3 ovos",
    "1/2 xícara de chocolate em pó"
  ],
  "tags": ["sobremesa", "chocolate", "fácil"],
  "source_url": null
}
```

**Response (201 Created)**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_123",
    "title": "Bolo de Chocolate",
    "ingredients": [...],
    "tags": ["sobremesa", "chocolate", "fácil"],
    "source_url": null,
    "created_at": "2024-08-27T10:30:00Z",
    "updated_at": "2024-08-27T10:30:00Z"
  },
  "message": "Recipe created successfully"
}
```

### POST /api/recipes/from-url (Create from URL)

**Request**:
```json
{
  "url": "https://www.tudogostoso.com.br/receita/37290-churros.html",
  "tags": ["doce", "café"]
}
```

**Processing**:
1. Validate URL (whitelist, RFC1918 check)
2. Scrape HTML (schema.org Recipe microdata priority)
3. Extract: title, ingredients, instructions
4. User reviews extracted data
5. Add tags → Save recipe

**Response (201 Created)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "title": "Churros Crocantes",
  "ingredients": [...extracted...],
  "tags": ["doce", "café"],
  "source_url": "https://www.tudogostoso.com.br/receita/37290-churros.html",
  "created_at": "2024-08-27T10:30:00Z",
  "updated_at": "2024-08-27T10:30:00Z"
}
```

### GET /api/recipes (List)

**Query Parameters**:
```
?page=1&per_page=20
```

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Bolo de Chocolate",
      "tags": ["sobremesa", "chocolate"],
      "created_at": "2024-08-27T10:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 42,
      "per_page": 20,
      "current_page": 1,
      "last_page": 3
    }
  }
}
```

### GET /api/recipes/{id} (Detail)

**Response (200 OK)**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_123",
    "title": "Bolo de Chocolate",
    "ingredients": [...],
    "tags": ["sobremesa", "chocolate"],
    "source_url": "https://www.tudogostoso.com.br/...",
    "created_at": "2024-08-27T10:30:00Z",
    "updated_at": "2024-08-27T10:30:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - User doesn't own recipe
- `404 Not Found` - Recipe not found

### PATCH /api/recipes/{id} (Update)

**Request**:
```json
{
  "title": "Bolo de Chocolate Aprimorado",
  "tags": ["sobremesa", "chocolate", "gourmet"]
}
```

**Response (200 OK)**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Bolo de Chocolate Aprimorado",
    "tags": ["sobremesa", "chocolate", "gourmet"],
    "updated_at": "2024-08-27T11:00:00Z"
  },
  "message": "Recipe updated successfully"
}
```

### DELETE /api/recipes/{id} (Delete)

**Response (200 OK)**:
```json
{
  "data": null,
  "message": "Recipe deleted successfully"
}
```

---

## Data Models

### Recipe (Eloquent Model)

```php
class Recipe extends Model {
    use SoftDeletes;
    
    protected $fillable = ['title', 'ingredients', 'tags', 'source_url'];
    
    protected $casts = [
        'ingredients' => 'array',
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
    
    public function user() {
        return $this->belongsTo(User::class);
    }
}
```

### RecipeDraft (for URL extraction - Phase 2)

```php
class RecipeDraft extends Model {
    protected $fillable = ['user_id', 'url', 'extracted_data', 'status'];
    
    protected $casts = [
        'extracted_data' => 'array',
        'created_at' => 'datetime',
    ];
}
```

---

## Database Schema

### recipes table

```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]',
    tags JSONB NOT NULL DEFAULT '[]',
    source_url VARCHAR(2048) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_recipes_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_deleted_at ON recipes(deleted_at);
```

---

## Validation Rules

### Title
- Required
- String
- Max 255 characters
- Min 3 characters
- Cannot be only whitespace

### Ingredients
- Required (create) / Optional (update)
- Array
- Max 20 items
- Each item: string, max 255 characters
- Cannot be empty array

### Tags
- Optional
- Array
- Max 10 items
- Each item: string, max 50 characters
- Valid chars: a-z, A-Z, 0-9, space, hyphen

### Source URL
- Optional
- Valid URL format (http:// or https://)
- Max 2048 characters
- Whitelist check (SSRF protection)
- RFC1918 IP blocking

---

## Service Layer

### RecipeService

```php
namespace App\Services;

class RecipeService {
    public function create(array $data): Recipe {
        // Validate
        // Save to database
        // Publish RecipeCreated event
        // Clear relevant caches
    }
    
    public function update(Recipe $recipe, array $data): Recipe {
        // Validate
        // Update database
        // Publish RecipeUpdated event
        // Clear caches
    }
    
    public function delete(Recipe $recipe): void {
        // Soft delete
        // Publish RecipeDeleted event
        // Clear caches
    }
    
    public function list(User $user, int $page = 1): Paginator {
        // Get user recipes
        // Exclude soft-deleted
        // Paginate
    }
}
```

### RecipeScraperService

```php
namespace App\Services;

class RecipeScraperService {
    public function extract(string $url): array {
        // Validate URL (whitelist, RFC1918)
        // Fetch HTML (timeout 10s, 5MB limit)
        // Parse schema.org Recipe
        // Fallback to heuristics
        // Return { title, ingredients, instructions }
    }
}
```

---

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Validation fails | 422 | `{ "message": "...", "errors": {...} }` |
| User not authenticated | 401 | `{ "message": "Unauthenticated" }` |
| User not owner | 403 | `{ "message": "Forbidden" }` |
| Recipe not found | 404 | `{ "message": "Not found" }` |
| Scraper timeout | 422 | `{ "message": "URL extraction timeout" }` |
| Private IP blocked | 422 | `{ "message": "Private IP blocked" }` |
| Domain not whitelisted | 422 | `{ "message": "Domain not whitelisted" }` |

---

## Testing Strategy

### Unit Tests
- `RecipeTest`: Create, validate, save
- `RecipeScraperTest`: Parse HTML, extract data
- `UrlValidatorTest`: Whitelist, RFC1918 blocking

### Feature Tests
- `CreateRecipeTest`: POST /api/recipes
- `CreateFromUrlTest`: POST /api/recipes/from-url
- `ListRecipesTest`: GET /api/recipes
- `ShowRecipeTest`: GET /api/recipes/{id}
- `UpdateRecipeTest`: PATCH /api/recipes/{id}
- `DeleteRecipeTest`: DELETE /api/recipes/{id}

### Coverage Target
- Backend: > 80%
- Frontend: > 70%

---

## Performance Targets

| Operation | Target | Comment |
|-----------|--------|---------|
| Create recipe | < 500ms | Validation + DB insert |
| List recipes (20 items) | < 200ms | With pagination |
| View recipe | < 200ms | Simple DB query |
| Update recipe | < 500ms | Validation + DB update |
| Delete recipe | < 200ms | Soft delete |
| Scrape URL | < 10s | Includes timeout |

---

## Security (OWASP)

- ✅ A01: Broken Access - recipe.owner middleware
- ✅ A02: Cryptographic - Bcrypt + JWT
- ✅ A03: Injection - Eloquent ORM parameterized
- ✅ A07: Authentication - JWT 1h expiration
- ✅ A08: Data Integrity - Foreign keys, soft deletes
- ✅ A10: SSRF - Whitelist + RFC1918 block

---

## Implementation Order

1. Database schema + migrations
2. Eloquent models + relationships
3. Form request validation
4. RecipeService + RecipeScraperService
5. Controllers + routes
6. Tests (unit + feature)
7. Frontend components
8. Frontend integration

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] API contracts validated
- [ ] Database schema created
- [ ] Models implemented
- [ ] Services working
- [ ] Controllers complete
- [ ] Tests passing (>80% coverage)
- [ ] Security checklist passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Code review approved

---

**Version**: 1.0  
**Status**: Ready for implementation  
**Owner**: Claude Code  
**Date**: 2024-08-27
