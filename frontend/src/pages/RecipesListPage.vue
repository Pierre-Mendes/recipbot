<script setup lang="ts">
import { onMounted } from 'vue'
import { BookX } from 'lucide-vue-next'

import RecipeCard from '@/components/RecipeCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Card from '@/components/ui/Card.vue'
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
  <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Minhas Receitas</h1>
        <p class="text-muted-foreground mt-1">Gerencie e descubra suas ideias culinárias favoritas.</p>
      </div>
    </div>
    
    <SearchBar :available-tags="store.tags" @search="handleSearch" />

    <div v-if="store.loading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Skeleton Loading Cards -->
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
    
    <div v-else-if="store.error" class="rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20 my-8">
      <p class="font-medium">Erro ao carregar as receitas</p>
      <p class="text-sm opacity-90">{{ store.error }}</p>
    </div>
    
    <div v-else-if="store.recipes.length === 0" class="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
      <div class="bg-primary/10 p-4 rounded-full mb-4">
        <BookX class="h-8 w-8 text-primary" />
      </div>
      <h3 class="text-lg font-semibold text-foreground mb-1">Nenhuma receita encontrada</h3>
      <p class="text-sm text-muted-foreground max-w-sm mb-6">
        Você ainda não adicionou nenhuma receita, ou nenhuma corresponde à sua busca.
      </p>
      <RouterLink to="/recipes/new">
        <Button>Adicionar minha primeira receita</Button>
      </RouterLink>
    </div>
    
    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <RecipeCard 
        v-for="(recipe, index) in store.recipes" 
        :key="recipe.id" 
        :recipe="recipe"
        class="animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
        :style="{ animationDelay: `${index * 100}ms` }"
      />
    </div>
  </div>
</template>
