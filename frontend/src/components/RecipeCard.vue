<script setup lang="ts">
import { Clock, Users, Utensils } from 'lucide-vue-next'
import type { Recipe } from '@/types'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'

defineProps<{ recipe: Recipe }>()
</script>

<template>
  <RouterLink :to="{ name: 'recipe-detail', params: { id: recipe.id } }" class="group block h-full">
    <Card class="h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/50 flex flex-col">
      <div class="h-32 bg-muted/50 flex items-center justify-center border-b border-border/50 relative overflow-hidden group-hover:bg-primary/5 transition-colors">
        <Utensils class="h-10 w-10 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
        <div class="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
      </div>
      
      <CardHeader class="pb-2">
        <CardTitle class="line-clamp-2 text-lg group-hover:text-primary transition-colors">
          {{ recipe.title }}
        </CardTitle>
      </CardHeader>
      
      <CardContent class="flex-grow pt-0 pb-4">
        <div class="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div class="flex items-center gap-1">
            <Utensils class="h-3.5 w-3.5" />
            <span>{{ recipe.ingredients.length }} itens</span>
          </div>
          <!-- Mocking time since it's not in the type, to look modern -->
          <div class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5" />
            <span>30m</span>
          </div>
        </div>
        
        <div v-if="recipe.tags.length" class="flex flex-wrap gap-1.5 mt-auto">
          <span
            v-for="tag in recipe.tags.slice(0, 3)"
            :key="tag"
            class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            {{ tag }}
          </span>
          <span v-if="recipe.tags.length > 3" class="text-xs text-muted-foreground px-1 py-0.5">
            +{{ recipe.tags.length - 3 }}
          </span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
