<script setup lang="ts">
import { onMounted, ref } from 'vue'

import RecipeCard from '@/components/RecipeCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import { useRecipesStore } from '@/stores/recipes'

const store = useRecipesStore()

// Remember the active filter so pagination re-runs the same list/search.
const activeQuery = ref('')
const activeTags = ref<string[]>([])

onMounted(() => {
  loadPage(1)
  store.fetchTags()
})

function loadPage(page: number) {
  if (!activeQuery.value && activeTags.value.length === 0) {
    store.fetchAll(page)
  } else {
    store.search(activeQuery.value, activeTags.value, page)
  }
}

function handleSearch(query: string, tags: string[]) {
  activeQuery.value = query
  activeTags.value = tags
  loadPage(1)
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
    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RecipeCard v-for="recipe in store.recipes" :key="recipe.id" :recipe="recipe" />
      </div>

      <nav
        v-if="store.meta && store.meta.last_page > 1"
        class="mt-4 flex items-center justify-center gap-3 text-sm"
        aria-label="Pagination"
      >
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          :disabled="store.meta.current_page <= 1"
          @click="loadPage(store.meta.current_page - 1)"
        >
          Previous
        </button>
        <span class="text-gray-600">
          Page {{ store.meta.current_page }} of {{ store.meta.last_page }}
        </span>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          :disabled="store.meta.current_page >= store.meta.last_page"
          @click="loadPage(store.meta.current_page + 1)"
        >
          Next
        </button>
      </nav>
    </template>
  </div>
</template>
