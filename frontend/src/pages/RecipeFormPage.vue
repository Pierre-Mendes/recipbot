<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RecipeForm from '@/components/RecipeForm.vue'
import { getRecipe } from '@/api/recipes'
import type { FromUrlInput, Recipe, RecipeFormInput } from '@/types'
import { useRecipesStore } from '@/stores/recipes'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()

const recipe = ref<Recipe | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const recipeId = route.params.id as string | undefined

onMounted(async () => {
  if (recipeId) {
    recipe.value = await getRecipe(recipeId)
  }
})

async function handleSubmit(input: RecipeFormInput) {
  loading.value = true
  error.value = null
  try {
    const saved = recipeId ? await store.update(recipeId, input) : await store.create(input)
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch {
    error.value = 'Could not save recipe. Check the form and try again.'
  } finally {
    loading.value = false
  }
}

async function handleSubmitFromUrl(input: FromUrlInput) {
  loading.value = true
  error.value = null
  try {
    const saved = await store.createFromUrl(input)
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch {
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
    <p v-if="recipeId && !recipe" class="text-sm text-gray-500">Loading...</p>
    <RecipeForm
      v-else
      :recipe="recipe"
      :loading="loading"
      @submit="handleSubmit"
      @submit-from-url="handleSubmitFromUrl"
    />
  </div>
</template>
