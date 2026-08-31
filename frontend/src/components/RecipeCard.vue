<script setup lang="ts">
import { computed } from 'vue'
import { Utensils, Clock, Link as LinkIcon } from 'lucide-vue-next'

import type { Recipe } from '@/types'
import { relativeTime, titleGradient } from '@/utils/format'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'

const props = withDefaults(
  defineProps<{
    recipe: Recipe
    layout?: 'grid' | 'list'
  }>(),
  { layout: 'grid' },
)

const gradient = computed(() => titleGradient(props.recipe.title))

const ingredientLabel = computed(() => {
  const n = props.recipe.ingredients?.length ?? 0
  return `${n} ${n === 1 ? 'ingrediente' : 'ingredientes'}`
})

const ingredientPreview = computed(() => (props.recipe.ingredients ?? []).slice(0, 3).join(', '))

const createdLabel = computed(() => relativeTime(props.recipe.created_at))
</script>

<template>
  <RouterLink :to="{ name: 'recipe-detail', params: { id: recipe.id } }" class="group block h-full">
    <!-- List layout: compact horizontal row -->
    <Card
      v-if="layout === 'list'"
      class="overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-md flex flex-row items-stretch"
    >
      <div
        class="relative w-24 shrink-0 flex items-center justify-center"
        :style="{ background: gradient }"
      >
        <Utensils class="h-7 w-7 text-white/80 drop-shadow-sm" />
      </div>
      <CardContent class="flex-1 min-w-0 py-4">
        <div class="flex items-start justify-between gap-2">
          <h3
            class="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors"
          >
            {{ recipe.title }}
          </h3>
          <LinkIcon
            v-if="recipe.source_url"
            class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1"
            aria-label="Importada de uma URL"
          />
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
          <span class="flex items-center gap-1">
            <Utensils class="h-3.5 w-3.5" />
            {{ ingredientLabel }}
          </span>
          <span v-if="createdLabel" class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5" />
            {{ createdLabel }}
          </span>
        </div>
        <p v-if="ingredientPreview" class="text-xs text-muted-foreground/80 truncate mt-1">
          {{ ingredientPreview }}
        </p>
        <div v-if="recipe.tags?.length" class="flex flex-wrap gap-1.5 mt-2">
          <span
            v-for="tag in recipe.tags.slice(0, 3)"
            :key="tag"
            class="inline-flex items-center rounded-full border border-transparent bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground"
          >
            {{ tag }}
          </span>
          <span v-if="recipe.tags?.length > 3" class="text-xs text-muted-foreground px-1 py-0.5">
            +{{ recipe.tags?.length - 3 }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Grid layout (default): vertical card with gradient banner -->
    <Card
      v-else
      class="h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/50 flex flex-col"
    >
      <div
        class="h-32 flex items-center justify-center relative overflow-hidden"
        :style="{ background: gradient }"
      >
        <Utensils
          class="h-10 w-10 text-white/80 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
        <span
          v-if="recipe.source_url"
          class="absolute top-2 right-2 flex items-center justify-center rounded-full bg-white/85 text-foreground/70 p-1.5 shadow-sm backdrop-blur-sm"
          title="Importada de uma URL"
        >
          <LinkIcon class="h-3.5 w-3.5" />
        </span>
      </div>

      <CardHeader class="pb-2">
        <CardTitle class="line-clamp-2 text-lg group-hover:text-primary transition-colors">
          {{ recipe.title }}
        </CardTitle>
      </CardHeader>

      <CardContent class="flex-grow pt-0 pb-4">
        <div class="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div class="flex items-center gap-1">
            <Utensils class="h-3.5 w-3.5" />
            <span>{{ ingredientLabel }}</span>
          </div>
          <div v-if="createdLabel" class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5" />
            <span>{{ createdLabel }}</span>
          </div>
        </div>

        <p v-if="ingredientPreview" class="text-xs text-muted-foreground/80 line-clamp-1 mb-3">
          {{ ingredientPreview }}
        </p>

        <div v-if="recipe.tags?.length" class="flex flex-wrap gap-1.5 mt-auto">
          <span
            v-for="tag in recipe.tags.slice(0, 3)"
            :key="tag"
            class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            {{ tag }}
          </span>
          <span v-if="recipe.tags?.length > 3" class="text-xs text-muted-foreground px-1 py-0.5">
            +{{ recipe.tags?.length - 3 }}
          </span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
