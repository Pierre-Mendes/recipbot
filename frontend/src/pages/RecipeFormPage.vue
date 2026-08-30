<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RecipeForm from '@/components/RecipeForm.vue'
import { getRecipe } from '@/api/recipes'
import type { FromUrlInput, Recipe, RecipeFormInput } from '@/types'
import { useRecipesStore } from '@/stores/recipes'
import { extractValidationErrors } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()

const recipe = ref<Recipe | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const fetching = ref(false)
const loadError = ref(false)
const validationErrors = ref<Record<string, string[]>>({})

const recipeId = route.params.id as string | undefined

onMounted(async () => {
  if (recipeId) {
    fetching.value = true
    try {
      recipe.value = await getRecipe(recipeId)
    } catch {
      // Don't leave the page stuck on "Loading..." forever when the recipe
      // can't be fetched (deleted, network error, not found).
      loadError.value = true
    } finally {
      fetching.value = false
    }
  }
})

async function handleSubmit(input: RecipeFormInput) {
  loading.value = true
  error.value = null
  validationErrors.value = {}
  try {
    const saved = recipeId ? await store.update(recipeId, input) : await store.create(input)
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch (e) {
    validationErrors.value = extractValidationErrors(e)
    error.value = 'Could not save recipe. Check the form and try again.'
  } finally {
    loading.value = false
  }
}

async function handleSubmitFromUrl(input: FromUrlInput) {
  loading.value = true
  error.value = null
  validationErrors.value = {}
  try {
    const saved = await store.createFromUrl(input)
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch (e) {
    validationErrors.value = extractValidationErrors(e)
    error.value = 'Could not import recipe from that URL.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-xl font-semibold">
      {{ recipeId ? 'Edit Recipe' : 'Add Recipe' }}
    </h1>
    <p v-if="error" class="mb-4 text-sm text-red-600">{{ error }}</p>
    <p v-if="fetching" class="text-sm text-gray-500">Loading...</p>
    <div v-else-if="loadError" class="text-sm text-red-600">
      Could not load this recipe. It may have been deleted.
      <RouterLink to="/" class="text-purple-600">Back to recipes</RouterLink>
    </div>
    <RecipeForm
      v-else
      :recipe="recipe"
      :loading="loading"
      :errors="validationErrors"
      @submit="handleSubmit"
      @submit-from-url="handleSubmitFromUrl"
    />
  </div>
</template>
