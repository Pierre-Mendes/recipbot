import { defineStore } from 'pinia'
import { ref } from 'vue'

import * as recipesApi from '@/api/recipes'
import type { FromUrlInput, PaginationMeta, Recipe, RecipeFormInput, TagCount } from '@/types'

export const useRecipesStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const tags = ref<TagCount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(page = 1): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await recipesApi.listRecipes(page)
      recipes.value = response.data
      meta.value = response.meta
    } catch {
      error.value = 'Failed to load recipes'
    } finally {
      loading.value = false
    }
  }

  async function search(query: string, selectedTags: string[], page = 1): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await recipesApi.searchRecipes({
        query: query || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        page,
      })
      recipes.value = response.data
      meta.value = response.meta
    } catch {
      error.value = 'Search failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchTags(): Promise<void> {
    try {
      tags.value = await recipesApi.listTags()
    } catch {
      tags.value = []
    }
  }

  async function create(input: RecipeFormInput): Promise<Recipe> {
    return recipesApi.createRecipe(input)
  }

  async function createFromUrl(input: FromUrlInput): Promise<Recipe> {
    return recipesApi.createRecipeFromUrl(input)
  }

  async function update(id: string, input: Partial<RecipeFormInput>): Promise<Recipe> {
    return recipesApi.updateRecipe(id, input)
  }

  async function remove(id: string): Promise<void> {
    await recipesApi.deleteRecipe(id)
    recipes.value = recipes.value.filter((r) => r.id !== id)
  }

  return {
    recipes,
    meta,
    tags,
    loading,
    error,
    fetchAll,
    search,
    fetchTags,
    create,
    createFromUrl,
    update,
    remove,
  }
})
