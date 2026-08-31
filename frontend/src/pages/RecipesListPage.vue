<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookX, SearchX, Tag as TagIcon, LayoutGrid, List } from 'lucide-vue-next'

import RecipeCard from '@/components/RecipeCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import Pagination from '@/components/ui/Pagination.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Card from '@/components/ui/Card.vue'
import { useRecipesStore } from '@/stores/recipes'
import type { Recipe } from '@/types'

const store = useRecipesStore()

// --- View mode (grid / list), persisted ------------------------------------
type ViewMode = 'grid' | 'list'
const VIEW_KEY = 'recipbot-view'
const viewMode = ref<ViewMode>('grid')
try {
  const stored = localStorage.getItem(VIEW_KEY)
  if (stored === 'grid' || stored === 'list') viewMode.value = stored
} catch {
  /* localStorage unavailable — keep default */
}
watch(viewMode, (val) => {
  try {
    localStorage.setItem(VIEW_KEY, val)
  } catch {
    /* ignore persistence failures */
  }
})

// --- Sorting (client-side over the current page) ----------------------------
type SortMode = 'recent' | 'oldest' | 'az' | 'za'
const sortBy = ref<SortMode>('recent')

const sortedRecipes = computed<Recipe[]>(() => {
  const list = [...store.recipes]
  switch (sortBy.value) {
    case 'az':
      return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    case 'za':
      return list.sort((a, b) => b.title.localeCompare(a.title, 'pt-BR'))
    case 'oldest':
      return list.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    case 'recent':
    default:
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  }
})

// --- Search context (kept so pagination re-fetches the right query) ---------
const activeQuery = ref('')
const activeTags = ref<string[]>([])
const isSearching = computed(() => activeQuery.value !== '' || activeTags.value.length > 0)

onMounted(() => {
  store.fetchAll()
  store.fetchTags()
})

function handleSearch(query: string, tags: string[]) {
  activeQuery.value = query
  activeTags.value = tags
  if (!query && tags.length === 0) {
    store.fetchAll()
    return
  }
  store.search(query, tags)
}

function goToPage(page: number) {
  if (isSearching.value) {
    store.search(activeQuery.value, activeTags.value, page)
  } else {
    store.fetchAll(page)
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Minhas Receitas</h1>
        <p class="text-muted-foreground mt-1">
          Gerencie e descubra suas ideias culinárias favoritas.
        </p>
      </div>
    </div>

    <SearchBar :available-tags="store.tags" @search="handleSearch" />

    <!-- Controls: result count + sort + view toggle -->
    <div
      v-if="!store.loading && !store.error && store.recipes.length > 0"
      class="flex flex-wrap items-center justify-between gap-3 mb-5"
    >
      <p class="text-sm text-muted-foreground">
        <span class="font-semibold text-foreground">{{
          store.meta?.total ?? store.recipes.length
        }}</span>
        {{ (store.meta?.total ?? store.recipes.length) === 1 ? 'receita' : 'receitas' }}
      </p>

      <div class="flex items-center gap-2">
        <label class="sr-only" for="sort">Ordenar</label>
        <select
          id="sort"
          v-model="sortBy"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
        >
          <option value="recent">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="az">Título (A–Z)</option>
          <option value="za">Título (Z–A)</option>
        </select>

        <div class="flex items-center rounded-md border border-input bg-background p-0.5 shadow-sm">
          <button
            type="button"
            :aria-pressed="viewMode === 'grid'"
            title="Grade"
            class="flex h-8 w-8 items-center justify-center rounded transition-colors"
            :class="
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="viewMode = 'grid'"
          >
            <LayoutGrid class="h-4 w-4" />
          </button>
          <button
            type="button"
            :aria-pressed="viewMode === 'list'"
            title="Lista"
            class="flex h-8 w-8 items-center justify-center rounded transition-colors"
            :class="
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="viewMode = 'list'"
          >
            <List class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="store.loading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i" class="h-full overflow-hidden flex flex-col">
        <Skeleton class="h-32 w-full rounded-none" />
        <div class="p-6 pb-2">
          <Skeleton class="h-6 w-3/4 mb-4" />
          <Skeleton class="h-4 w-1/2 mb-8" />
          <div class="flex gap-2">
            <Skeleton class="h-5 w-16 rounded-full" />
            <Skeleton class="h-5 w-20 rounded-full" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Error -->
    <div
      v-else-if="store.error"
      class="rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20 my-8"
    >
      <p class="font-medium">Erro ao carregar as receitas</p>
      <p class="text-sm opacity-90">{{ store.error }}</p>
    </div>

    <!-- Empty states (contextual) -->
    <div
      v-else-if="store.recipes.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted/30"
    >
      <!-- No results for a text search -->
      <template v-if="activeQuery">
        <div class="bg-muted p-4 rounded-full mb-4">
          <SearchX class="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-1">Nenhum resultado</h3>
        <p class="text-sm text-muted-foreground max-w-sm">
          Nenhuma receita corresponde a “{{ activeQuery }}”. Tente outros termos.
        </p>
      </template>
      <!-- No results for a tag filter -->
      <template v-else-if="activeTags.length">
        <div class="bg-muted p-4 rounded-full mb-4">
          <TagIcon class="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-1">Nenhuma receita com essa tag</h3>
        <p class="text-sm text-muted-foreground max-w-sm">
          Não há receitas marcadas com {{ activeTags.map((t) => `“${t}”`).join(', ') }}.
        </p>
      </template>
      <!-- No recipes at all -->
      <template v-else>
        <div class="bg-primary/10 p-4 rounded-full mb-4">
          <BookX class="h-8 w-8 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-1">Nenhuma receita ainda</h3>
        <p class="text-sm text-muted-foreground max-w-sm mb-6">
          Comece adicionando sua primeira receita — manualmente ou importando de uma URL.
        </p>
        <RouterLink to="/recipes/new">
          <Button>Adicionar minha primeira receita</Button>
        </RouterLink>
      </template>
    </div>

    <!-- Results -->
    <template v-else>
      <div
        :class="
          viewMode === 'grid'
            ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-3'
        "
      >
        <RecipeCard
          v-for="(recipe, index) in sortedRecipes"
          :key="recipe.id"
          :recipe="recipe"
          :layout="viewMode"
          class="animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
          :style="{ animationDelay: `${Math.min(index, 8) * 60}ms` }"
        />
      </div>

      <Pagination v-if="store.meta" :meta="store.meta" @page-change="goToPage" />
    </template>
  </div>
</template>
