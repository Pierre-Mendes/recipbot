import { defineStore } from 'pinia'
import { ref } from 'vue'

import * as recipesApi from '@/api/recipes'
import type {
  FromUrlInput,
  PaginationMeta,
  Recipe,
  RecipeDraft,
  RecipeFormInput,
  TagCount,
} from '@/types'

export const useRecipesStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const tags = ref<TagCount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // fetchAll() and search() both write recipes/meta/loading, and a fast series
  // of tag toggles (or clearing a filter mid-request) can leave a slower older
  // request in flight. Track a monotonic sequence so only the newest request
  // applies its result and clears loading; superseded ones are dropped.
  let listRequestSeq = 0

  async function fetchAll(page = 1): Promise<void> {
    const seq = ++listRequestSeq
    loading.value = true
    error.value = null
    try {
      const response = await recipesApi.listRecipes(page)
      if (seq !== listRequestSeq) return
      recipes.value = response.data
      meta.value = response.meta
    } catch {
      if (seq !== listRequestSeq) return
      error.value = 'Failed to load recipes'
    } finally {
      if (seq === listRequestSeq) loading.value = false
    }
  }

  async function search(query: string, selectedTags: string[], page = 1): Promise<void> {
    const seq = ++listRequestSeq
    loading.value = true
    error.value = null
    try {
      const response = await recipesApi.searchRecipes({
        query: query || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        page,
      })
      if (seq !== listRequestSeq) return
      recipes.value = response.data
      meta.value = response.meta
    } catch {
      if (seq !== listRequestSeq) return
      error.value = 'Search failed'
    } finally {
      if (seq === listRequestSeq) loading.value = false
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

  async function previewFromUrl(input: FromUrlInput): Promise<RecipeDraft> {
    return recipesApi.previewRecipeFromUrl(input)
  }

  // One "Arquivo" upload, dispatched by type: a spreadsheet uses the
  // structured reader; a PDF or image goes through text/OCR extraction.
  async function importFile(file: File): Promise<RecipeDraft> {
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      return recipesApi.importRecipeSpreadsheet(file)
    }
    return recipesApi.importRecipeFile(file)
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
    previewFromUrl,
    importFile,
    update,
    remove,
  }
})
