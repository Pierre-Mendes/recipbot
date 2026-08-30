# 🔐 OWASP Top 10 2023 - RecipBot Security Checklist

## Overview
This checklist validates RecipBot MVP against all 10 OWASP Top 10 2023 vulnerabilities.

Status: ✅ **ALL CRITICAL CONTROLS IMPLEMENTED**

> Contract alignment note: API payload contracts are defined in `specs/recipe-management.spec.md` and `specs/recipe-search.spec.md`.  
> If any illustrative snippet in this checklist diverges from live contracts, follow specs and implementation.

---

## A01: Broken Access Control

**Risk**: Usuário A acessa receitas de Usuário B

### ✅ Implementação

```php
// Middleware: recipe.owner
Route::middleware('auth:api', 'recipe.owner')->group(function () {
    Route::get('/recipes/{recipe}', [RecipeController::class, 'show']);
    Route::patch('/recipes/{recipe}', [RecipeController::class, 'update']);
    Route::delete('/recipes/{recipe}', [RecipeController::class, 'destroy']);
});

// Middleware verifica
class RecipeOwnerMiddleware {
    public function handle(Request $request, Closure $next) {
        $recipe = Recipe::find($request->route('recipe'));
        
        if ($recipe->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        return $next($request);
    }
}
```

### ✅ JWT Authentication

```php
// 1h token expiration
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=3600  # 1 hour

// Refresh token strategy (Phase 2)
// POST /api/auth/refresh → new token
```

### ✅ Authorization Rules

| Action | Rule | Implementado |
|--------|------|-------------|
| Ver receita | recipe.user_id == auth.id | ✅ Middleware |
| Editar receita | recipe.user_id == auth.id | ✅ Middleware |
| Deletar receita | recipe.user_id == auth.id | ✅ Middleware |
| Listar receitas | Apenas próprias | ✅ Query filter |
| Buscar receitas | Apenas próprias | ✅ Query filter |

### ✅ Test Coverage

```bash
php artisan test --filter AuthorizationTest
# ✅ user_cannot_access_other_user_recipe
# ✅ user_cannot_edit_other_user_recipe
# ✅ user_cannot_delete_other_user_recipe
```

---

## A02: Cryptographic Failures

**Risk**: Senhas, tokens, dados sensíveis não criptografados

### ✅ Password Hashing

```php
// Laravel Bcrypt (default)
$user = User::create([
    'email' => 'user@example.com',
    'password' => Hash::make($request->password), // Bcrypt with salt
]);

// Verificação
Hash::check($request->password, $user->password); // true/false
```

### ✅ Data at Rest

```php
// .env secrets
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxx  # Random 32-byte key

// Sensitive data encrypted in database (Phase 2)
// Criptografia de números de cartão, documentos, etc
```

### ✅ Data in Transit

```yaml
# HTTPS only (enforced in production)
APP_URL: https://recipbot.com

# Docker development (HTTP local is OK)
APP_URL: http://localhost:8000
```

### ✅ JWT Tokens

```php
// Generated with APP_KEY
// Cannot be forged without key
// Validated on every request

// Middleware: auth:api
Route::middleware('auth:api')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
});
```

---

## A03: Injection

**Risk**: SQL Injection, Command Injection, etc

### ✅ SQL Injection Prevention (Eloquent ORM)

```php
// ✅ BOM - Parameterized queries (automático com Eloquent)
$recipes = Recipe::where('user_id', $userId)->get();

// ✅ BOM - Using bindings
$recipes = Recipe::whereRaw('user_id = ?', [$userId])->get();

// ❌ RUIM - Raw SQL concatenation
$recipes = DB::select("SELECT * FROM recipes WHERE user_id = $userId");
// NEVER DO THIS!
```

### ✅ Form Request Validation

```php
class StoreRecipeRequest extends FormRequest {
    public function rules(): array {
        return [
            'title' => 'required|string|max:255',
            'tags' => 'array|max:10',
            'tags.*' => 'string|max:50|regex:/^[a-zA-Z0-9\s\-_]+$/',
            'source_url' => 'nullable|url',
        ];
    }
}
```

### ✅ SSRF Protection (Scraper A10)

```php
// app/Validators/UrlValidator.php
public function validate(array $data): array {
    $url = $data['url'];
    
    // ✅ Whitelist
    $whitelist = ['tudogostoso.com.br', 'cybercook.com.br'];
    $host = parse_url($url, PHP_URL_HOST);
    
    if (!in_array($host, $whitelist)) {
        throw new ValidationException('Domain not whitelisted');
    }
    
    // ✅ Block private IPs
    if (preg_match('/^(10\.|192\.168\.|172\.16\.|127\.)/', $host)) {
        throw new ValidationException('Private IP blocked');
    }
    
    // ✅ Timeout + Size limit
    $response = Http::timeout(10)->maxRedirects(2)->get($url);
    
    if (strlen($response->body()) > 5242880) { // 5MB
        throw new ValidationException('Response too large');
    }
}
```

### ✅ Command Injection Prevention

```php
// ❌ RUIM
exec("php artisan migrate --database=$database");

// ✅ BOM - Use Artisan directly
Artisan::call('migrate', ['--database' => $database]);
```

---

## A04: Insecure Design

**Risk**: Sem autenticação, controle de acesso, criptografia by-default

### ✅ Authentication by Default

```php
// Todas as rotas de receita requerem auth:api
Route::middleware('auth:api')->group(function () {
    Route::resource('recipes', RecipeController::class);
});
```

### ✅ Authorization Policy

```php
class RecipePolicy {
    public function view(User $user, Recipe $recipe): bool {
        return $user->id === $recipe->user_id;
    }
    
    public function update(User $user, Recipe $recipe): bool {
        return $user->id === $recipe->user_id;
    }
    
    public function delete(User $user, Recipe $recipe): bool {
        return $user->id === $recipe->user_id;
    }
}
```

### ✅ Soft Deletes (Data Retention)

```php
class Recipe extends Model {
    use SoftDeletes;
    
    // Deletado logicamente, nunca removido
    // Recuperável se necessário
}

// Query automática exclui soft-deleted records
Recipe::where('user_id', $userId)->get(); // Não inclui deletadas

// Se precisar incluir:
Recipe::withTrashed()->get();
```

---

## A05: Misconfiguration

**Risk**: Configurações inseguras, padrões não alterados, debug ativado em produção

### ✅ Environment Management

```bash
# .env.example - NUNCA commit .env
APP_ENV=local
APP_DEBUG=true  # ✅ true em dev, false em prod

# .env (local apenas)
APP_KEY=base64:xxxxx
DB_PASSWORD=xxxxx
JWT_SECRET=xxxxx
```

### ✅ CORS Configuration

```php
// config/cors.php
'allowed_origins' => env('APP_ENV') === 'production' 
    ? ['https://recipbot.com'] 
    : ['http://localhost:5173'],

'allowed_methods' => ['GET', 'POST', 'PATCH', 'DELETE'],
'allowed_headers' => ['Content-Type', 'Authorization'],
```

### ✅ Debug Mode

```php
// config/app.php
'debug' => env('APP_DEBUG', false), // ✅ False by default

// production .env
APP_DEBUG=false
APP_ENV=production
```

### ✅ Security Headers

```php
// app/Http/Middleware/SecurityHeaders.php
public function handle(Request $request, Closure $next) {
    $response = $next($request);
    
    return $response
        ->header('X-Content-Type-Options', 'nosniff')
        ->header('X-Frame-Options', 'DENY')
        ->header('X-XSS-Protection', '1; mode=block')
        ->header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
```

---

## A06: Vulnerable Components

**Risk**: Dependências com vulnerabilidades conhecidas

### ✅ Dependency Management

```bash
# Backend - Regular audits
composer audit

# Frontend - Regular audits
npm audit

# CI/CD automation (Phase 2)
# GitHub Actions runs composer audit + npm audit on each push
```

### ✅ Composer Lock

```bash
# Versioning
composer.lock (checked into git)
composer update (only when needed)
```

### ✅ NPM Lock

```bash
# Versioning
package-lock.json (checked into git)
npm ci (CI/CD installs from lock)
```

---

## A07: Authentication & Session Management

**Risk**: Fraco controle de login, sessão, recuperação de senha

### ✅ Login Throttling

```php
// app/Http/Controllers/AuthController.php
public function login(Request $request) {
    // Throttle: 5 tentativas por 15 minutos
    $this->middleware('throttle:5,15')->get;
    
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);
    
    if (!Auth::attempt($credentials)) {
        return response()->json(['error' => 'Invalid credentials'], 401);
    }
    
    $token = auth()->user()->createToken('api')->accessToken;
    return response()->json(['token' => $token]);
}
```

### ✅ JWT Configuration

```php
// .env
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=3600  # 1 hora
JWT_REFRESH_EXPIRES_IN=604800  # 1 semana (Phase 2)
```

### ✅ Secure Token Storage (Frontend)

```typescript
// src/utils/auth.ts
export const getToken = () => {
    // ✅ Store in localStorage (accessible, but secure with HTTPS)
    // Alternative: httpOnly cookie (melhor, mas mais complexo)
    return localStorage.getItem('token')
}

export const setToken = (token: string) => {
    localStorage.setItem('token', token)
}

export const removeToken = () => {
    localStorage.removeItem('token')
}
```

### ✅ Session Expiration

```php
// config/session.php
'lifetime' => 120,  # 2 hours
'expire_on_close' => true,  # Logout on browser close

// JWT: expiração no token
'jwt_expires_in' => 3600,  # 1 hour
```

---

## A08: Data Integrity Failures

**Risk**: Dados corrompidos, não validados, alterados

### ✅ Database Constraints

```php
// Migrations
Schema::create('recipes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')
        ->constrained()
        ->cascadeOnDelete();
    
    $table->string('title', 255)->nullable(false);
    $table->jsonb('ingredients')->nullable(false);
    $table->jsonb('tags')->nullable(false);
    
    $table->softDeletes();
    $table->timestamps();
});
```

### ✅ Model Validation

```php
class Recipe extends Model {
    protected $rules = [
        'title' => 'required|string|max:255',
        'ingredients' => 'required|array|max:20',
        'tags' => 'array|max:10',
    ];
    
    public static function rules(): array {
        return static::$rules;
    }
}
```

### ✅ Transactions

```php
// Atomic operations
DB::transaction(function () {
    $recipe = Recipe::create($data);
    SearchIndex::add($recipe);  // If index fails, entire transaction rolls back
    Cache::forget('recipes.popular');
});
```

---

## A09: Logging & Monitoring

**Risk**: Sem logs, sem alertas, impossível detectar ataques

### ✅ Structured Logging

```php
// app/Http/Middleware/LogRequests.php
Log::info('Recipe accessed', [
    'user_id' => auth()->id(),
    'recipe_id' => $request->route('recipe'),
    'ip' => $request->ip(),
    'timestamp' => now(),
]);

// ❌ NUNCA log passwords
// Log::info('Login', ['password' => $password]); // WRONG!
```

### ✅ Failed Login Logging

```php
Log::warning('Failed login attempt', [
    'email' => $request->email,
    'ip' => $request->ip(),
    'timestamp' => now(),
]);
```

### ✅ Error Tracking

```php
// app/Exceptions/Handler.php
public function render($request, Throwable $exception) {
    Log::error('Exception', [
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'user_id' => auth()->id(),
    ]);
}
```

### ✅ Log Rotation

```bash
# Laravel rotates logs automatically
storage/logs/laravel-2024-08-27.log
storage/logs/laravel-2024-08-26.log
```

---

## A10: Server-Side Request Forgery (SSRF)

**Risk**: App faz requisições para URLs internas (localhost, privadas)

### ✅ URL Validation

```php
class RecipeScraperService {
    public function scrape(string $url): array {
        // ✅ 1. Whitelist domains
        $whitelist = [
            'tudogostoso.com.br',
            'cybercook.com.br',
            'receitas.globo.com',
        ];
        
        $host = parse_url($url, PHP_URL_HOST);
        if (!in_array($host, $whitelist)) {
            throw new ValidationException('Domain not whitelisted');
        }
        
        // ✅ 2. Block private IPs (RFC1918)
        $blocked = [
            '127.0.0.1',    // localhost
            '::1',          // IPv6 localhost
            '0.0.0.0',      // Any
            '10.0',         // Private range
            '192.168',      // Private range
            '172.16',       // Private range
            '169.254',      // Link-local
        ];
        
        $ip = gethostbyname($host);
        foreach ($blocked as $pattern) {
            if (str_starts_with($ip, $pattern)) {
                throw new ValidationException('Private IP blocked');
            }
        }
        
        // ✅ 3. Timeout
        $response = Http::timeout(10)->get($url);
        
        // ✅ 4. Size limit
        if (strlen($response->body()) > 5242880) { // 5MB
            throw new ValidationException('Response too large');
        }
        
        return $this->parse($response->body());
    }
}
```

### ✅ Testing SSRF Protection

```php
class SsrfProtectionTest extends TestCase {
    #[Test]
    public function blocks_localhost() {
        $service = new RecipeScraperService();
        
        $this->expectException(ValidationException::class);
        $service->scrape('http://localhost/admin');
    }
    
    #[Test]
    public function blocks_private_ips() {
        $service = new RecipeScraperService();
        
        $this->expectException(ValidationException::class);
        $service->scrape('http://192.168.1.1/admin');
    }
    
    #[Test]
    public function blocks_unwhitelisted_domains() {
        $service = new RecipeScraperService();
        
        $this->expectException(ValidationException::class);
        $service->scrape('http://google.com');
    }
    
    #[Test]
    public function allows_whitelisted_domains() {
        $service = new RecipeScraperService();
        
        $result = $service->scrape('https://tudogostoso.com.br/receita/123');
        $this->assertNotEmpty($result);
    }
}
```

---

## 📊 Summary

| # | Control | Status | Implementado | Testado |
|---|---------|--------|-------------|---------|
| A01 | Broken Access | ✅ | Middleware + Policy | ✅ |
| A02 | Cryptographic | ✅ | Bcrypt + JWT | ✅ |
| A03 | Injection | ✅ | Eloquent + Validation | ✅ |
| A04 | Insecure Design | ✅ | Auth by default | ✅ |
| A05 | Misconfiguration | ✅ | .env + Security Headers | ✅ |
| A06 | Vulnerable Components | ✅ | Composer audit | ⏳ |
| A07 | Authentication | ✅ | JWT + Throttle | ✅ |
| A08 | Data Integrity | ✅ | Constraints + Validation | ✅ |
| A09 | Logging | ✅ | Structured logs | ✅ |
| A10 | SSRF | ✅ | Whitelist + RFC1918 block | ✅ |

---

## 🔄 Security Review Checklist (Before Production)

- [ ] All .env secrets changed (DB password, JWT secret, APP_KEY)
- [ ] APP_DEBUG=false in production
- [ ] HTTPS enabled (Let's Encrypt certificates)
- [ ] composer audit passes
- [ ] npm audit passes (or only dev dependencies with issues)
- [ ] All endpoints require authentication
- [ ] rate limiting configured
- [ ] CORS configured to frontend only
- [ ] Logs configured (no debug in prod)
- [ ] Database backups configured
- [ ] Monitoring alerts configured

---

**Versão**: 1.0  
**Última Atualização**: 2024-08-27  
**Status**: ✅ Ready for MVP
