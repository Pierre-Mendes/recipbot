# Security Context - ReviewAgent

## 🔐 OWASP Top 10 - RecipBot Implementation

Este arquivo define como cada vulnerabilidade OWASP é prevenida e validada.

---

## 1. ✅ Injection (SQL, Command, LDAP)

### SQL Injection Prevention

**❌ Vulnerable Code:**
```php
// DO NOT DO THIS
$recipes = DB::select("SELECT * FROM recipes WHERE tags LIKE '%{$query}%'");
```

**✅ Safe Code:**
```php
// Use parameterized queries
$recipes = Recipe::whereJsonContains('tags', $query)->get();

// Or use bindings
$recipes = DB::select("SELECT * FROM recipes WHERE tags @> ?", [json_encode([$query])]);

// Use Eloquent ORM (safe by default)
$recipes = Recipe::where('title', 'like', "%{$query}%")->get();
```

### Validation in FormRequest

```php
class StoreRecipeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'tags' => 'array|max:20',
            'tags.*' => 'string|max:50|regex:/^[a-zA-Z0-9_-]+$/',
        ];
    }
}
```

### Testing SQL Injection

```php
test('prevents SQL injection in search', function () {
    $malicious = "'; DROP TABLE recipes; --";
    
    // Should not throw error, should escape
    $results = app(RecipeService::class)
        ->searchByTags([$malicious]);
    
    expect($results)->toBeEmpty();
    expect(Recipe::count())->toBeGreaterThan(0); // Table still exists
});
```

---

## 2. ✅ Broken Authentication

### JWT Configuration

**Backend (.env):**
```
JWT_SECRET=your-very-long-random-secret-min-32-chars
JWT_EXPIRATION=3600  # 1 hour
```

**Login Validation:**
```php
public function login(LoginRequest $request): JsonResponse
{
    if (!Auth::attempt($request->validated())) {
        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    $user = Auth::user();
    $token = $user->createToken('auth-token')->plainTextToken;

    return response()->json([
        'access_token' => $token,
        'token_type' => 'Bearer',
        'expires_in' => 3600,
    ]);
}
```

### Token Validation Middleware

```php
class AuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Sanctum validates JWT automatically
        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
```

### Login Throttling

```php
// routes/api.php
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,15'); // 5 attempts per 15 minutes
```

### Password Hashing

```php
// ❌ Never do this
$password = $_POST['password'];
DB::insert('INSERT INTO users (password) VALUES (?)', [$password]);

// ✅ Always hash
$user = User::create([
    'email' => $request->email,
    'password' => Hash::make($request->password), // Automatic in Laravel
]);
```

---

## 3. ✅ Sensitive Data Exposure

### Protect Sensitive Fields

```php
class User extends Model
{
    protected $hidden = [
        'password',      // Never return password
        'remember_token',
    ];

    protected $visible = [
        'id',
        'email',
        'name',
        'created_at',
    ];
}
```

### API Response Format

```php
// ❌ Bad - Exposes password
return response()->json($user);

// ✅ Good - Uses hidden attribute
return response()->json($user); // Password excluded

// Or explicit
return new UserResource($user);
```

### Encrypt Sensitive Data

```php
class Recipe extends Model
{
    // Encrypt source URL if sensitive
    protected $casts = [
        'source_url' => 'encrypted',
    ];
}
```

### HTTPS Only

```php
// config/app.php
'url' => env('APP_URL', 'https://recipbot.com'),
'secure' => env('APP_SECURE', true),
```

---

## 4. ✅ XML External Entities (XXE)

### Disable XML Parsing

```php
// Disable XXE by default
libxml_disable_entity_loader(true);

// If parsing XML:
$dom = new DOMDocument();
$dom->load('file.xml', LIBXML_NOENT | LIBXML_DTDLOAD);

// Better: Use SimpleXML with safety
$xml = simplexml_load_file('file.xml', null, LIBXML_NOENT);
```

### File Upload Security

```php
class StoreRecipeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'image' => 'nullable|image|max:5120', // 5MB max
        ];
    }
}

// Handler
public function store(StoreRecipeRequest $request)
{
    if ($request->hasFile('image')) {
        $path = $request->file('image')->store('recipes', 'public');
        // Don't use uploaded filename directly
    }
}
```

---

## 5. ✅ Broken Access Control

### Authorization Middleware

```php
// app/Policies/RecipePolicy.php
public function view(User $user, Recipe $recipe): bool
{
    return $user->id === $recipe->user_id;
}

public function update(User $user, Recipe $recipe): bool
{
    return $user->id === $recipe->user_id;
}

public function delete(User $user, Recipe $recipe): bool
{
    return $user->id === $recipe->user_id;
}
```

### Controller Authorization

```php
class RecipeController extends Controller
{
    public function show(Recipe $recipe)
    {
        $this->authorize('view', $recipe);
        return new RecipeResource($recipe);
    }

    public function update(Request $request, Recipe $recipe)
    {
        $this->authorize('update', $recipe);
        // ... update logic
    }

    public function destroy(Recipe $recipe)
    {
        $this->authorize('delete', $recipe);
        $recipe->delete();
    }
}
```

### Scope Queries to User

```php
class RecipeController extends Controller
{
    public function index()
    {
        // ❌ Bad - Shows all recipes
        // $recipes = Recipe::all();

        // ✅ Good - Only user's recipes
        $recipes = auth()->user()->recipes;
        return RecipeResource::collection($recipes);
    }
}
```

---

## 6. ✅ Security Misconfiguration

### Disable Debug Mode in Production

```php
// .env
APP_DEBUG=false  # Production
APP_DEBUG=true   # Development only
```

### Set Security Headers

```php
// app/Http/Middleware/SecurityHeaders.php
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->header('X-Content-Type-Options', 'nosniff');
        $response->header('X-Frame-Options', 'DENY');
        $response->header('X-XSS-Protection', '1; mode=block');
        $response->header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        return $response;
    }
}
```

### CORS Configuration

```php
// config/cors.php
'paths' => ['api/*'],
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
```

---

## 7. ✅ Cross-Site Scripting (XSS)

### Vue 3 Protection (Automatic)

```vue
<!-- ❌ Vulnerable -->
<div v-html="userContent"></div>

<!-- ✅ Safe (escapes by default) -->
<div>{{ userContent }}</div>
```

### Content Security Policy

```php
// app/Http/Middleware/SecurityHeaders.php
$response->header('Content-Security-Policy', 
    "default-src 'self'; " .
    "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; " .
    "style-src 'self' 'unsafe-inline'; " .
    "img-src 'self' data: https:;"
);
```

### Sanitize User Input

```php
// If you must use v-html:
$recipe->description = Purifier::clean($input);

// In view:
<div>{{ Str::limit($recipe->description, 100) }}</div>
```

---

## 8. ✅ Insecure Deserialization

### Don't Serialize User Objects

```php
// ❌ Bad
$user = Auth::user();
$serialized = serialize($user);
Cache::put('user', $serialized);

// ✅ Good
Cache::put('user', $user->only(['id', 'email', 'name']));
```

### Type Checking on Unserialize

```php
$data = unserialize($cached_data);
if (!$data instanceof Recipe) {
    throw new Exception('Invalid deserialized data');
}
```

---

## 9. ✅ Using Components with Known Vulnerabilities

### Audit Dependencies

```bash
# Check for known vulnerabilities
composer audit

# Update packages
composer update

# Check front-end
npm audit
npm audit fix
```

### CI/CD Scanning

```yaml
# GitHub Actions
- name: Audit dependencies
  run: composer audit
  continue-on-error: true  # Don't block, but alert
```

---

## 10. ✅ Insufficient Logging & Monitoring

### Log Security Events

```php
class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->validated())) {
            Log::warning('Failed login attempt', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'timestamp' => now(),
            ]);
            
            throw ValidationException::withMessages([...]);
        }

        Log::info('User logged in', [
            'user_id' => Auth::id(),
            'ip' => $request->ip(),
        ]);

        return response()->json([...]);
    }
}
```

### Monitor Suspicious Activity

```php
class Recipe extends Model
{
    protected static function booted(): void
    {
        static::deleted(function ($recipe) {
            Log::notice('Recipe deleted', [
                'recipe_id' => $recipe->id,
                'user_id' => auth()->id(),
                'timestamp' => now(),
            ]);
        });
    }
}
```

---

## 🛡️ RecipBot Specific Security

### SSRF (Server-Side Request Forgery) Protection

```php
// app/Services/RecipeScraperService.php
private function isUrlSafe(string $url): bool
{
    $host = parse_url($url, PHP_URL_HOST);
    
    // Whitelist allowed domains
    $whitelist = [
        'tudogostoso.com.br',
        'cybercook.com.br',
        'receitas.globo.com',
    ];
    
    if (!in_array($host, $whitelist)) {
        throw new Exception("Domain '{$host}' not whitelisted");
    }
    
    // Block RFC 1918 private IPs
    if (preg_match('/^(10\.|192\.168\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[01]\.)/', $host)) {
        throw new Exception('Private IP detected');
    }
    
    return true;
}
```

### Rate Limiting on API

```php
// routes/api.php
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::post('/recipes', [RecipeController::class, 'store']);
    // ... other endpoints
});
```

### JWT Best Practices

```
✅ Expiration: 1 hour
✅ Refresh tokens: 7 days
✅ Secret: 32+ characters
✅ Algorithm: HS256 (symmetric)
✅ Stored: HTTP-only cookies (not localStorage)
```

---

## 🧪 Security Testing Checklist

Before deployment:

```
□ Run composer audit (no high severity)
□ Run npm audit (no high severity)
□ Test SQL injection (search endpoints)
□ Test XSS (user input rendering)
□ Test SSRF (scraper endpoint)
□ Test auth bypass (JWT validation)
□ Test authorization (user isolation)
□ Test CSRF (form submissions)
□ Check headers (X-Frame-Options, etc)
□ Verify HTTPS only
□ Check password hashing
□ Verify soft deletes (data retention)
```

---

## 📋 Security Audit Checklist

When ReviewAgent audits code:

1. **Injection Attacks**
   - [ ] All user input validated
   - [ ] Parameterized queries used
   - [ ] No raw SQL with user data

2. **Authentication**
   - [ ] JWT properly configured
   - [ ] Login throttling enabled
   - [ ] Passwords hashed

3. **Access Control**
   - [ ] User isolation verified
   - [ ] Policies enforced
   - [ ] Authorization checked

4. **Data Exposure**
   - [ ] Sensitive fields hidden
   - [ ] No secrets in logs
   - [ ] HTTPS configured

5. **Dependencies**
   - [ ] No known vulnerabilities
   - [ ] Audited with composer/npm
   - [ ] Updated regularly

6. **Headers & Config**
   - [ ] Security headers set
   - [ ] CORS configured
   - [ ] Debug disabled in prod

