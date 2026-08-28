<script setup lang="ts">
import { onMounted } from 'vue'

import RecipeCard from '@/components/RecipeCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import { useRecipesStore } from '@/stores/recipes'

const store = useRecipesStore()

onMounted(() => {
  store.fetchAll()
  store.fetchTags()
})

function handleSearch(query: string, tags: string[]) {
  if (!query && tags.length === 0) {
    store.fetchAll()
    return
  }
  store.search(query, tags)
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-xl font-semibold">My Recipes</h1>
    <SearchBar :available-tags="store.tags" @search="handleSearch" />

    <p v-if="store.loading" class="text-sm text-gray-500">Loading...</p>
    <p v-else-if="store.error" class="text-sm text-red-600">{{ store.error }}</p>
    <p v-else-if="store.recipes.length === 0" class="text-sm text-gray-500">
      No recipes found. <RouterLink to="/recipes/new" class="text-purple-600">Add one</RouterLink>
    </p>
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RecipeCard v-for="recipe in store.recipes" :key="recipe.id" :recipe="recipe" />
    </div>
  </div>
</template>
