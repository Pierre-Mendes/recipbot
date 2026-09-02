import { apiClient } from '@/api/client'
import type {
  ApiResponse,
  FromUrlInput,
  PaginatedRecipes,
  Recipe,
  RecipeDraft,
  RecipeFormInput,
  SearchInput,
  TagCount,
} from '@/types'

/**
 * Coerce a raw recipe payload into the shape the UI relies on. The API is
 * *supposed* to return `ingredients`/`tags` as arrays (jsonb columns with a
 * `[]` default) and `instructions` as an array-or-null, but a stale backend,
 * a legacy row, or a null jsonb value can send `null` instead. Rendering code
 * does `recipe.tags.length` / `ingredients.join(...)`, so a null field there
 * throws a TypeError mid-render and blanks the whole page. Normalizing once,
 * at the boundary, keeps every consumer (detail page, form, cards) safe.
 */
export function normalizeRecipe(raw: Recipe): Recipe {
  return {
    ...raw,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    instructions: Array.isArray(raw.instructions) ? raw.instructions : null,
  }
}

/**
 * Pull the recipe object out of a single-recipe response. The endpoints wrap
 * it as `{ data: <recipe> }`, but tolerate an unwrapped body too so a backend
 * that returns the model directly still renders instead of silently blanking.
 * Throws when no usable recipe is present, so callers surface a proper
 * "not found" state rather than resolving to `undefined`.
 */
function unwrapRecipe(body: unknown): Recipe {
  const candidate =
    body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body
  if (!candidate || typeof candidate !== 'object' || !('id' in candidate)) {
    throw new Error('Malformed recipe response: missing recipe payload')
  }
  return normalizeRecipe(candidate as Recipe)
}

export async function listRecipes(page = 1): Promise<PaginatedRecipes> {
  const { data } = await apiClient.get<ApiResponse<Recipe[]>>('/recipes', { params: { page } })
  return {
    data: (data.data ?? []).map(normalizeRecipe),
    meta: data.meta?.pagination ?? { current_page: 1, total: 0, per_page: 20, last_page: 1 },
  }
}

export async function getRecipe(id: string): Promise<Recipe> {
  const { data } = await apiClient.get(`/recipes/${id}`)
  return unwrapRecipe(data)
}

export async function createRecipe(input: RecipeFormInput): Promise<Recipe> {
  const { data } = await apiClient.post('/recipes', input)
  return unwrapRecipe(data)
}

export async function updateRecipe(id: string, input: Partial<RecipeFormInput>): Promise<Recipe> {
  const { data } = await apiClient.patch(`/recipes/${id}`, input)
  return unwrapRecipe(data)
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiClient.delete(`/recipes/${id}`)
}

/**
 * Download a recipe as an .xlsx workbook. The endpoint is JWT-protected, so we
 * fetch the bytes through the authenticated client (a plain link can't send the
 * Authorization header) and return the Blob for the caller to save.
 */
export async function exportRecipe(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/recipes/${id}/export`, { responseType: 'blob' })
  return data as Blob
}

/** Download a recipe as a PDF (see {@link exportRecipe} for why we fetch bytes). */
export async function exportRecipePdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/recipes/${id}/export-pdf`, { responseType: 'blob' })
  return data as Blob
}

export async function createRecipeFromUrl(input: FromUrlInput): Promise<Recipe> {
  const { data } = await apiClient.post('/recipes/from-url', input)
  return unwrapRecipe(data)
}

/**
 * Coerce a raw draft payload into a safe shape. Like {@link normalizeRecipe},
 * the list fields must never be null when the review form renders them.
 */
function normalizeDraft(raw: Partial<RecipeDraft> & { id: string }): RecipeDraft {
  return {
    id: raw.id,
    title: raw.title ?? '',
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    source_url: raw.source_url ?? null,
  }
}

function unwrapDraft(body: unknown): RecipeDraft {
  const candidate =
    body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body
  if (!candidate || typeof candidate !== 'object' || !('id' in candidate)) {
    throw new Error('Malformed draft response: missing draft payload')
  }
  return normalizeDraft(candidate as Partial<RecipeDraft> & { id: string })
}

/**
 * Extract a recipe from a URL into a review draft WITHOUT saving it. Returns
 * the draft for the user to review and edit before creating the recipe.
 */
export async function previewRecipeFromUrl(input: FromUrlInput): Promise<RecipeDraft> {
  const { data } = await apiClient.post('/recipes/preview-url', input)
  return unwrapDraft(data)
}

/**
 * Upload an .xlsx (the export/template format) and get back a review draft -
 * same review-before-save flow as URL import, from a file instead.
 */
export async function importRecipeSpreadsheet(file: File): Promise<RecipeDraft> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post('/recipes/import-spreadsheet', form)
  return unwrapDraft(data)
}

export async function searchRecipes(input: SearchInput): Promise<PaginatedRecipes> {
  const { data } = await apiClient.post<ApiResponse<Recipe[]>>('/recipes/search', input)
  return {
    data: (data.data ?? []).map(normalizeRecipe),
    meta: data.meta?.pagination ?? { current_page: 1, total: 0, per_page: 20, last_page: 1 },
  }
}

export async function listTags(): Promise<TagCount[]> {
  const { data } = await apiClient.get<ApiResponse<TagCount[]>>('/tags')
  return data.data
}
