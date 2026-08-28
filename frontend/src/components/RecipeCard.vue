<script setup lang="ts">
import type { Recipe } from '@/types'

defineProps<{ recipe: Recipe }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'recipe-detail', params: { id: recipe.id } }"
    class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
  >
    <h3 class="text-base font-semibold text-gray-900">{{ recipe.title }}</h3>
    <p class="mt-1 text-sm text-gray-500">{{ recipe.ingredients.length }} ingredients</p>
    <div v-if="recipe.tags.length" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="tag in recipe.tags"
        :key="tag"
        class="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
      >
        {{ tag }}
      </span>
    </div>
  </RouterLink>
</template>
