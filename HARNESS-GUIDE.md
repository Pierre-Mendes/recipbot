# 🔨 HARNESS-GUIDE - Como Trabalhar com Pipelines

## 📚 O que é Harness?

Harness é uma **arquitetura declarativa** baseada em pipelines que definem:
1. **O QUÊ** fazer (stages)
2. **COMO** fazer (validators, transformers)
3. **QUAL** é o output esperado (artifacts)

Ao invés de código solto, você descreve workflows em YAML.

---

## 📊 Estrutura Básica

```yaml
# .harness/features/recipe-management.yaml

name: Recipe Management Pipeline
description: Fluxo completo de gerenciamento de receitas

stages:
  - stage: input_validation
    description: Valida entrada do usuário
    input: { url: string, tags: array }
    validators:
      - schema: UrlValidator
      - rule: tags_max_10
    output: validated_input
    
  - stage: content_extraction
    description: Extrai conteúdo da URL
    input: validated_input
    transformers:
      - service: RecipeScraperService
      - method: extract(url)
    output: extracted_content
    error_handling: retry_3x_with_backoff
    
  - stage: enrichment
    description: Enriquece dados
    input: extracted_content
    transformers:
      - service: TagSuggestionService
      - service: EmbeddingService
    output: enriched_recipe
    
  - stage: persistence
    description: Salva no banco
    input: enriched_recipe
    validators:
      - ensure: no_duplicates
    artifacts:
      - type: recipe
        action: create
    output: persisted_recipe

success_path: persisted_recipe
error_path: notify_user_with_reason
```

---

## 🎯 Componentes

### 1. Stages
Passos sequenciais de um pipeline.

```yaml
stages:
  - stage: scrape_url
    description: Fazer scraping de URL
    input: url           # O que recebe
    timeout: 10s         # Máximo 10 segundos
    retry: 3             # Tenta 3x se falhar
    transformers:        # O que faz
      - service: ScraperService
        method: extract
    output: recipe_data  # O que retorna
```

**Características**:
- ✅ Sequencial (um começa quando outro termina)
- ✅ Timeout automático
- ✅ Retry automático com backoff
- ✅ Error handling declarativo
- ✅ Observabilidade integrada

---

### 2. Validators
Validam dados em cada stage.

```yaml
validators:
  # Validator por schema
  - schema: RecipeSchema
    message: "Recipe deve ter title e ingredients"
  
  # Validator por regra
  - rule: tags_max_10
    message: "Máximo 10 tags"
  
  # Validator customizado
  - custom: EnsureNoDuplicates
```

**No Código**:
```php
// app/Validators/RecipeSchema.php
class RecipeSchema implements Validator {
    public function validate(array $data): ValidationResult {
        return [
            'title' => 'required|string|max:255',
            'ingredients' => 'required|array|max:20',
            'tags' => 'array|max:10',
        ];
    }
}
```

---

### 3. Transformers
Transformam dados entre stages.

```yaml
transformers:
  # Transformer por serviço
  - service: RecipeScraperService
    method: extract
    input_map: { url: url }
    output_map: { recipe: extracted_recipe }
  
  # Transformer por closure
  - transformer: anonymous
    code: |
      return {
        title: input.recipe.title,
        tags: input.suggested_tags,
      };
```

**No Código**:
```php
// app/Services/RecipeScraperService.php
class RecipeScraperService {
    public function extract(string $url): array {
        $html = file_get_contents($url);
        return $this->parseHtml($html);
    }
}
```

---

### 4. Artifacts
Outputs do pipeline (coisas criadas/modificadas).

```yaml
artifacts:
  - type: recipe
    action: create
    output_field: persisted_recipe
    
  - type: event
    action: publish
    event_class: RecipeCreated
    payload_field: persisted_recipe
    
  - type: cache_invalidation
    action: invalidate
    keys: ['recipes.all', 'tags.popular']
```

---

## 🚀 Fluxo Prático: Criar Receita por URL

### Step 1: Definir Pipeline (YAML)

```yaml
# .harness/features/recipe-from-url.yaml

name: Create Recipe from URL
description: User copia URL → App extrai → Salva receita

triggers:
  - api: POST /api/recipes/from-url

input_schema:
  properties:
    url:
      type: string
      pattern: "^https?://"
    tags:
      type: array
      items: { type: string }

stages:
  - stage: validate_url
    input: { url, tags }
    validators:
      - schema: UrlValidator
    output: validated_url
    
  - stage: extract_recipe
    input: validated_url
    transformers:
      - service: RecipeScraperService
        method: extract
    timeout: 10s
    retry: 3
    output: extracted_recipe
    
  - stage: enrich_recipe
    input: extracted_recipe
    transformers:
      - service: EmbeddingService
        method: generate
    output: enriched_recipe
    
  - stage: save_recipe
    input: { enriched_recipe, tags }
    transformers:
      - service: RecipeService
        method: createFromScrape
    artifacts:
      - type: recipe
        action: create
    output: recipe

success_path: { status: 201, recipe }
error_path: { status: 422, error: error_message }
```

### Step 2: Implementar Validators

```php
// app/Validators/UrlValidator.php
namespace App\Validators;

use Illuminate\Validation\Validator;

class UrlValidator {
    public function validate(array $data): array {
        return [
            'url' => [
                'required',
                'url',
                function($attribute, $value, $fail) {
                    // SSRF Protection
                    if ($this->isPrivateIp($value)) {
                        $fail('Private IP blocked');
                    }
                    
                    if (!$this->isDomainWhitelisted($value)) {
                        $fail('Domain not whitelisted');
                    }
                }
            ],
            'tags' => 'array|max:10',
        ];
    }
    
    private function isPrivateIp(string $url): bool {
        $host = parse_url($url, PHP_URL_HOST);
        $privateRanges = ['10.0', '192.168', '172.16'];
        
        foreach($privateRanges as $range) {
            if (str_starts_with($host, $range)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function isDomainWhitelisted(string $url): bool {
        $whitelist = [
            'tudogostoso.com.br',
            'cybercook.com.br',
            'receitas.globo.com',
        ];
        
        $host = parse_url($url, PHP_URL_HOST);
        return in_array($host, $whitelist);
    }
}
```

### Step 3: Implementar Transformers

```php
// app/Services/RecipeScraperService.php
namespace App\Services;

use Goutte\Client;

class RecipeScraperService {
    public function extract(string $url): array {
        $client = new Client();
        $response = $client->request('GET', $url);
        
        // Tentar schema.org Recipe microdata primeiro
        $recipe = $this->parseSchema($response);
        
        if (!$recipe) {
            // Fallback para heurística
            $recipe = $this->parseHeuristic($response);
        }
        
        return $recipe;
    }
    
    private function parseSchema($response): ?array {
        $text = $response->html();
        
        // Buscar <script type="application/ld+json">
        preg_match_all(
            '/<script type="application\/ld\+json">(.+?)<\/script>/s',
            $text,
            $matches
        );
        
        foreach($matches[1] as $json) {
            $data = json_decode($json, true);
            if ($data['@type'] === 'Recipe') {
                return [
                    'title' => $data['name'] ?? '',
                    'ingredients' => $data['recipeIngredient'] ?? [],
                    'instructions' => $data['recipeInstructions'] ?? [],
                ];
            }
        }
        
        return null;
    }
    
    private function parseHeuristic($response): array {
        // Fallback parsing de HTML genérico
        $crawler = new Crawler($response->html());
        
        $title = $crawler->filter('h1')->text() ?? '';
        $ingredients = $crawler->filter('.ingredients li')
            ->each(fn($node) => $node->text());
        
        return [
            'title' => $title,
            'ingredients' => $ingredients,
            'instructions' => [],
        ];
    }
}
```

### Step 4: Executar Pipeline

```php
// app/Http/Controllers/RecipeController.php
namespace App\Http\Controllers;

use App\Harness\PipelineExecutor;

class RecipeController extends Controller {
    public function createFromUrl(Request $request, PipelineExecutor $executor) {
        // Harness executa todo pipeline YAML
        $result = $executor->execute('recipe-from-url', [
            'url' => $request->input('url'),
            'tags' => $request->input('tags'),
        ]);
        
        if ($result->isSuccess()) {
            return response()->json($result->artifact('recipe'), 201);
        } else {
            return response()->json([
                'error' => $result->error(),
            ], 422);
        }
    }
}
```

---

## 📊 Monitoramento

Harness publica automaticamente:

```php
// Logs de cada stage
RecipeFromUrlPipeline::validate_url → PASS (12ms)
RecipeFromUrlPipeline::extract_recipe → PASS (2341ms)
RecipeFromUrlPipeline::enrich_recipe → PASS (156ms)
RecipeFromUrlPipeline::save_recipe → PASS (43ms)
→ Pipeline COMPLETED (2552ms)

// Métricas
pipeline.duration: 2552ms
pipeline.stage.extract_recipe.duration: 2341ms
pipeline.retries: 0
pipeline.success_rate: 99.2%
```

---

## 🔄 Padrões Comuns

### Pattern 1: Validação → Transformação → Persistência

```yaml
stages:
  - stage: validate
    validators: [SchemaValidator]
    output: valid_data
  
  - stage: transform
    transformers: [EnrichedService]
    output: enriched_data
  
  - stage: persist
    artifacts: [{ type: entity, action: create }]
    output: entity
```

---

### Pattern 2: Retry com Backoff

```yaml
stages:
  - stage: external_api_call
    transformers:
      - service: ExternalApiService
    retry: 5              # Tenta 5x
    backoff: exponential  # 1s, 2s, 4s, 8s, 16s
    timeout: 30s
```

---

### Pattern 3: Error Recovery

```yaml
stages:
  - stage: primary_source
    transformers: [PrimaryService]
    output: data
    on_error:
      - stage: fallback_source
        transformers: [FallbackService]
        output: data
```

---

## 🚨 Troubleshooting

### Pipeline trava no stage
```bash
# Ver logs detalhados
tail -f storage/logs/harness.log | grep "recipe-from-url"

# Verificar timeout
docker-compose logs app | grep "timeout"

# Reexecutar stage específico
php artisan harness:retry recipe-from-url --stage=extract_recipe
```

### Validator falhando
```bash
# Testar validator isolado
php artisan tinker

# In tinker:
$validator = new \App\Validators\UrlValidator();
$result = $validator->validate(['url' => 'invalid']);
dd($result);
```

### Transformer retornando dados errados
```php
// Logar output de cada stage
echo json_encode($stage->output, JSON_PRETTY_PRINT);

// Ou usar debugger
Log::debug('Stage output', $stage->output);
```

---

## 📚 Leia Também

- `specs/recipe-management.spec.md` - Especificação completa
- `.harness/features/*.yaml` - Exemplos de pipelines
- `docs/ARCHITECTURE.md` - Arquitetura geral

---

**Versão**: 1.0  
**Status**: Pronto para usar  
**Próxima Ação**: Ler specs/ e implementar primeiro pipeline
