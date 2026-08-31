import { apiClient } from '@/api/client'
import type {
  ApiResponse,
  FromUrlInput,
  PaginatedRecipes,
  Recipe,
  RecipeFormInput,
  SearchInput,
  TagCount,
} from '@/types'

export async function listRecipes(page = 1): Promise<PaginatedRecipes> {
  const { data } = await apiClient.get<ApiResponse<Recipe[]>>('/recipes', { params: { page } })
  return {
    data: data.data,
    meta: data.meta?.pagination ?? { current_page: 1, total: 0, per_page: 20, last_page: 1 },
  }
}

export async function getRecipe(id: string): Promise<Recipe> {
  const { data } = await apiClient.get<ApiResponse<Recipe>>(`/recipes/${id}`)
  return data.data
}

export async function createRecipe(input: RecipeFormInput): Promise<Recipe> {
  const { data } = await apiClient.post<ApiResponse<Recipe>>('/recipes', input)
  return data.data
}

export async function updateRecipe(id: string, input: Partial<RecipeFormInput>): Promise<Recipe> {
  const { data } = await apiClient.patch<ApiResponse<Recipe>>(`/recipes/${id}`, input)
  return data.data
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiClient.delete(`/recipes/${id}`)
}

export async function createRecipeFromUrl(input: FromUrlInput): Promise<Recipe> {
  const { data } = await apiClient.post<ApiResponse<Recipe>>('/recipes/from-url', input)
  return data.data
}

export async function searchRecipes(input: SearchInput): Promise<PaginatedRecipes> {
  const { data } = await apiClient.post<ApiResponse<Recipe[]>>('/recipes/search', input)
  return {
    data: data.data,
    meta: data.meta?.pagination ?? { current_page: 1, total: 0, per_page: 20, last_page: 1 },
  }
}

export async function listTags(): Promise<TagCount[]> {
  const { data } = await apiClient.get<ApiResponse<TagCount[]>>('/tags')
  return data.data
}
