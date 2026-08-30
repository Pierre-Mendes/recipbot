<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getRecipe } from '@/api/recipes'
import type { Recipe } from '@/types'
import { useRecipesStore } from '@/stores/recipes'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()

const recipe = ref<Recipe | null>(null)
const notFound = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

const id = route.params.id as string

onMounted(async () => {
  try {
    recipe.value = await getRecipe(id)
  } catch {
    notFound.value = true
  }
})

async function handleDelete() {
  if (!confirm('Delete this recipe?')) return
  deleting.value = true
  error.value = null
  try {
    await store.remove(id)
    router.push({ name: 'recipes' })
  } catch {
    error.value = 'Could not delete the recipe. Please try again.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div v-if="notFound" class="text-sm text-gray-500">Recipe not found.</div>
  <div v-else-if="recipe">
    <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
    <div class="mb-4 flex items-start justify-between">
      <h1 class="text-xl font-semibold">{{ recipe.title }}</h1>
      <div class="flex gap-2">
        <RouterLink
          :to="{ name: 'recipe-edit', params: { id: recipe.id } }"
          class="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
        >
          Edit
        </RouterLink>
        <button
          type="button"
          :disabled="deleting"
          class="rounded bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
          @click="handleDelete"
        >
          {{ deleting ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </div>

    <div v-if="recipe.tags.length" class="mb-4 flex flex-wrap gap-1">
      <span
        v-for="tag in recipe.tags"
        :key="tag"
        class="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
      >
        {{ tag }}
      </span>
    </div>

    <h2 class="mb-2 font-medium text-gray-900">Ingredients</h2>
    <ul class="mb-4 list-inside list-disc text-sm text-gray-700">
      <li v-for="(ingredient, i) in recipe.ingredients" :key="i">{{ ingredient }}</li>
    </ul>

    <template v-if="recipe.instructions?.length">
      <h2 class="mb-2 font-medium text-gray-900">Instructions</h2>
      <ol class="list-inside list-decimal text-sm text-gray-700">
        <li v-for="(step, i) in recipe.instructions" :key="i">{{ step }}</li>
      </ol>
    </template>

    <p v-if="recipe.source_url" class="mt-4 text-xs text-gray-400">
      Source:
      <a :href="recipe.source_url" target="_blank" rel="noopener" class="underline">{{
        recipe.source_url
      }}</a>
    </p>
  </div>
</template>
