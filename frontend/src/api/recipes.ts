import { apiClient } from '@/api/client'
import type {
  FromUrlInput,
  PaginatedRecipes,
  Recipe,
  RecipeFormInput,
  SearchInput,
  TagCount,
} from '@/types'

export async function listRecipes(page = 1): Promise<PaginatedRecipes> {
  const { data } = await apiClient.get<PaginatedRecipes>('/recipes', { params: { page } })
  return data
}

export async function getRecipe(id: string): Promise<Recipe> {
  const { data } = await apiClient.get<{ data: Recipe }>(`/recipes/${id}`)
  return data.data
}

export async function createRecipe(input: RecipeFormInput): Promise<Recipe> {
  const { data } = await apiClient.post<{ data: Recipe }>('/recipes', input)
  return data.data
}

export async function updateRecipe(id: string, input: Partial<RecipeFormInput>): Promise<Recipe> {
  const { data } = await apiClient.patch<{ data: Recipe }>(`/recipes/${id}`, input)
  return data.data
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
  const { data } = await apiClient.post<{ data: Recipe }>('/recipes/from-url', input)
  return data.data
}

export async function searchRecipes(input: SearchInput): Promise<PaginatedRecipes> {
  const { data } = await apiClient.post<PaginatedRecipes>('/recipes/search', input)
  return data
}

export async function listTags(): Promise<TagCount[]> {
  const { data } = await apiClient.get<{ tags: TagCount[] }>('/tags')
  return data.tags
}
