import { apiClient } from '@/api/client'
import type {
  FromUrlInput,
  PaginatedRecipes,
  PaginationMeta,
  Recipe,
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
  const { data } = await apiClient.get<PaginatedRecipes>('/recipes', { params: { page } })
  return { ...data, data: (data.data ?? []).map(normalizeRecipe) }
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

// NOTE: /recipes/from-url, /recipes/search, and /tags are specified in
// specs/recipe-management.spec.md and specs/recipe-search.spec.md and are
// implemented on the (separate, not-yet-merged) feat/recipe-scraper and
// feat/recipe-search branches - not on this branch's backend yet. These
// calls are written against those specs' documented contracts and are
// covered here by mocked tests only; they can't be live-verified against a
// running backend until those branches merge alongside this one.

export async function createRecipeFromUrl(input: FromUrlInput): Promise<Recipe> {
  const { data } = await apiClient.post('/recipes/from-url', input)
  return unwrapRecipe(data)
}

/**
 * Raw shape of POST /recipes/search per specs/recipe-search.spec.md: pagination
 * lives under `pagination` (not `meta`, which carries search timing/cache info).
 * We normalize it to the same `{ data, meta }` shape the list endpoint returns
 * so the store and pagination UI can treat both identically.
 */
interface SearchResponse {
  data: Recipe[]
  pagination: PaginationMeta
  meta?: { search_time_ms: number; cache_hit: boolean }
}

export async function searchRecipes(input: SearchInput): Promise<PaginatedRecipes> {
  const { data } = await apiClient.post<SearchResponse>('/recipes/search', input)
  return { data: (data.data ?? []).map(normalizeRecipe), meta: data.pagination }
}

export async function listTags(): Promise<TagCount[]> {
  const { data } = await apiClient.get<{ tags: TagCount[] }>('/tags')
  return data.tags
}
