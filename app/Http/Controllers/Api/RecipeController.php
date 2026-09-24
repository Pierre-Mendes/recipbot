<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\RecipeScrapingException;
use App\Http\Requests\ConfirmPdfImportRequest;
use App\Http\Requests\FromUrlRequest;
use App\Http\Requests\ImportFileRequest;
use App\Http\Requests\ImportPdfRequest;
use App\Http\Requests\ImportSpreadsheetRequest;
use App\Http\Requests\IndexRecipesRequest;
use App\Http\Requests\StoreRecipeRequest;
use App\Http\Requests\UpdateRecipeRequest;
use App\Http\Resources\RecipeResource;
use App\Models\Recipe;
use App\Models\User;
use App\Services\RecipeDraftService;
use App\Services\RecipePdfImportStore;
use App\Services\RecipePdfSegmenter;
use App\Services\RecipeScraperService;
use App\Services\RecipeService;
use App\Services\RecipeSpreadsheetService;
use App\Services\RecipeTextImportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RecipeController extends ApiController
{
    public function __construct(
        private readonly RecipeService $recipes,
    ) {}

    /**
     * List the authenticated user's recipes (paginated).
     */
    public function index(IndexRecipesRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $perPage = (int) $request->input('per_page', config('recipbot.pagination.recipes_default_per_page', 20));
        $recipes = $this->recipes->getUserRecipes($user, $perPage);

        return $this->paginated($recipes, RecipeResource::collection($recipes));
    }

    /**
     * Create a new recipe (manual input).
     */
    public function store(StoreRecipeRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $recipe = $this->recipes->create($user, $request->validated());

        return $this->success(new RecipeResource($recipe), 'Recipe created successfully', status: 201);
    }

    /**
     * Create a new recipe by scraping it from a whitelisted URL.
     */
    public function fromUrl(FromUrlRequest $request, RecipeScraperService $scraper): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $extracted = $scraper->extract($request->validated('url'));
        } catch (RecipeScrapingException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $recipe = $this->recipes->create($user, [
            'title' => $extracted['title'],
            'ingredients' => $extracted['ingredients'],
            'instructions' => $extracted['instructions'],
            'tags' => $request->validated('tags') ?? [],
            'source_url' => $request->validated('url'),
        ]);

        return $this->success(new RecipeResource($recipe), 'Recipe created successfully', status: 201);
    }

    /**
     * Extract a recipe from a whitelisted URL into a review draft, WITHOUT
     * persisting it. The draft is cached (Redis) and returned so the user can
     * review and edit it before creating the recipe through the normal store
     * endpoint - importing never writes a recipe directly.
     */
    public function previewUrl(FromUrlRequest $request, RecipeScraperService $scraper, RecipeDraftService $drafts): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $extracted = $scraper->extract($request->validated('url'));
        } catch (RecipeScrapingException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $draft = [
            'title' => $extracted['title'],
            'ingredients' => $extracted['ingredients'],
            'instructions' => $extracted['instructions'],
            'tags' => $request->validated('tags') ?? [],
            'source_url' => $request->validated('url'),
        ];

        $id = $drafts->store($user, $draft);

        return $this->success(['id' => $id, ...$draft], 'Recipe draft created', status: 201);
    }

    /**
     * Extract a recipe from an uploaded .xlsx (the export/template schema) into
     * a review draft, WITHOUT persisting it - same review-before-save flow as
     * URL import, just a different source. Reads the first worksheet for now.
     */
    public function importSpreadsheet(ImportSpreadsheetRequest $request, RecipeSpreadsheetService $spreadsheets, RecipeDraftService $drafts): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $draft = $spreadsheets->read($file->getRealPath());

        if ($draft['title'] === '' && $draft['ingredients'] === []) {
            return response()->json(['message' => 'Could not read a recipe from this spreadsheet.'], 422);
        }

        $id = $drafts->store($user, $draft);

        return $this->success(['id' => $id, ...$draft], 'Recipe draft created', status: 201);
    }

    /**
     * Extract a recipe from an uploaded PDF or photo (via text/OCR) into a
     * review draft, WITHOUT persisting it - same review-before-save flow.
     */
    public function importFile(ImportFileRequest $request, RecipeTextImportService $extractor, RecipeDraftService $drafts): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var UploadedFile $file */
        $file = $request->file('file');

        $text = $extractor->extractText($file);
        $draft = $extractor->parse($text);

        if ($draft['title'] === '' && $draft['ingredients'] === []) {
            return response()->json(['message' => 'Could not read a recipe from this file.'], 422);
        }

        $id = $drafts->store($user, $draft);

        return $this->success(['id' => $id, ...$draft], 'Recipe draft created', status: 201);
    }

    /**
     * Analyze a (possibly multi-recipe) PDF for the page picker: read its text
     * page by page, suggest which pages form which recipe, and cache the text
     * so the confirmation step doesn't need the file again. Nothing becomes a
     * draft until the user confirms or corrects the suggestion.
     */
    public function importPdf(ImportPdfRequest $request, RecipeTextImportService $extractor, RecipePdfSegmenter $segmenter, RecipePdfImportStore $imports): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var UploadedFile $file */
        $file = $request->file('file');

        try {
            $pages = $extractor->extractPdfPages($file->getRealPath());
        } catch (\Exception) {
            // pdfparser throws plain exceptions for encrypted/corrupt files.
            return response()->json(['message' => 'Could not read this PDF.'], 422);
        }

        $maxPages = (int) config('recipbot.pdf_import.max_pages', 150);
        if (count($pages) > $maxPages) {
            return response()->json(['message' => "This PDF has too many pages (max {$maxPages})."], 422);
        }

        if (array_filter($pages, fn (string $page) => $page !== '') === []) {
            return response()->json(['message' => 'This PDF has no readable text (it may be a scanned image).'], 422);
        }

        $id = $imports->store($user, $pages);

        return $this->success([
            'id' => $id,
            'page_count' => count($pages),
            'pages' => array_map(fn (string $text, int $index) => [
                'number' => $index + 1,
                'excerpt' => mb_substr(trim(preg_replace('/\s+/u', ' ', $text) ?? $text), 0, 180),
                'has_text' => $text !== '',
            ], $pages, array_keys($pages)),
            'recipes' => $segmenter->segment($pages),
        ], 'PDF analyzed', status: 201);
    }

    /**
     * Turn the user-confirmed page groups of an analyzed PDF into one review
     * draft per recipe - still nothing is saved until each draft is reviewed.
     */
    public function confirmPdfImport(ConfirmPdfImportRequest $request, RecipeTextImportService $extractor, RecipePdfImportStore $imports, RecipeDraftService $drafts, string $import): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $pages = $imports->find($user, $import);
        if ($pages === null) {
            return response()->json(['message' => 'PDF import not found or expired.'], 404);
        }

        /** @var list<array{title?: string|null, pages: list<int>}> $groups */
        $groups = $request->validated('recipes');

        foreach ($groups as $index => $group) {
            foreach ($group['pages'] as $page) {
                if ($page > count($pages)) {
                    throw ValidationException::withMessages([
                        "recipes.{$index}.pages" => 'Page out of range',
                    ]);
                }
            }
        }

        $created = [];
        foreach ($groups as $group) {
            $numbers = $group['pages'];
            sort($numbers);

            $text = implode("\n", array_map(fn (int $page) => $pages[$page - 1], $numbers));
            $draft = $extractor->parse($text, $group['title'] ?? null);

            $created[] = ['id' => $drafts->store($user, $draft), ...$draft];
        }

        return $this->success($created, 'Recipe drafts created', status: 201);
    }

    /**
     * Re-fetch a cached import draft so the review form survives a reload.
     */
    public function draft(Request $request, RecipeDraftService $drafts, string $draft): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $drafts->find($user, $draft);

        if ($data === null) {
            return response()->json(['message' => 'Draft not found or expired.'], 404);
        }

        return $this->success(['id' => $draft, ...$data]);
    }

    /**
     * Export a single recipe as an .xlsx workbook (owner-only). Uses the same
     * schema as the import template, so an exported file can be edited and
     * imported back.
     */
    public function export(Recipe $recipe, RecipeSpreadsheetService $spreadsheets): Response
    {
        Gate::authorize('view', $recipe);

        $bytes = $spreadsheets->write([$recipe]);
        $filename = (Str::slug($recipe->title) ?: 'receita').'.xlsx';

        return response($bytes, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Export a single recipe as a PDF (owner-only) - a printable "cookbook
     * page" rendered from a Blade view.
     */
    public function exportPdf(Recipe $recipe): Response
    {
        Gate::authorize('view', $recipe);

        $pdf = Pdf::loadView('pdf.recipe', ['recipe' => $recipe]);
        $filename = (Str::slug($recipe->title) ?: 'receita').'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * View a single recipe (owner-only).
     */
    public function show(Recipe $recipe): JsonResponse
    {
        Gate::authorize('view', $recipe);

        return $this->success(new RecipeResource($recipe));
    }

    /**
     * Update a recipe (owner-only).
     */
    public function update(UpdateRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        Gate::authorize('update', $recipe);

        $recipe = $this->recipes->update($recipe, $request->validated());

        return $this->success(new RecipeResource($recipe), 'Recipe updated successfully');
    }

    /**
     * Delete a recipe (soft delete, owner-only).
     */
    public function destroy(Recipe $recipe): JsonResponse
    {
        Gate::authorize('delete', $recipe);

        $this->recipes->delete($recipe);

        return $this->success(null, 'Recipe deleted successfully');
    }
}
