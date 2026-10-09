<script setup lang="ts">
import { computed } from 'vue'
import { Utensils, Clock, Link as LinkIcon } from 'lucide-vue-next'

import type { Recipe } from '@/types'
import { recipeTone, relativeTime, titleInitial, type RecipeTone } from '@/utils/format'
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

/** Static class names per tone so Tailwind can see them at build time. */
const TONE_CLASSES: Record<RecipeTone, string> = {
  basil: 'bg-tone-basil text-tone-basil-foreground',
  paprika: 'bg-tone-paprika text-tone-paprika-foreground',
  saffron: 'bg-tone-saffron text-tone-saffron-foreground',
  flour: 'bg-tone-flour text-tone-flour-foreground',
}

const toneClass = computed(() => TONE_CLASSES[recipeTone(props.recipe.title)])

const initial = computed(() => titleInitial(props.recipe.title))

const ingredientLabel = computed(() => {
  const n = props.recipe.ingredients?.length ?? 0
  return `${n} ${n === 1 ? 'ingrediente' : 'ingredientes'}`
})

const ingredientPreview = computed(() => (props.recipe.ingredients ?? []).slice(0, 3).join(', '))

const createdLabel = computed(() => relativeTime(props.recipe.created_at))
</script>

<template>
  <RouterLink
    :to="{ name: 'recipe-detail', params: { id: recipe.id } }"
    class="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    <!-- List layout: compact horizontal row -->
    <Card
      v-if="layout === 'list'"
      class="flex flex-row items-center gap-3 overflow-hidden p-2 transition-[border-color,box-shadow] duration-150 group-hover:border-primary group-hover:shadow-sm"
    >
      <div
        :class="[
          'flex h-18 w-18 shrink-0 items-center justify-center rounded-md font-display text-3xl font-extrabold',
          toneClass,
        ]"
        aria-hidden="true"
      >
        {{ initial }}
      </div>
      <CardContent class="min-w-0 flex-1 p-0 pr-2">
        <div class="flex items-start justify-between gap-2">
          <h3 class="truncate font-sans text-base font-semibold tracking-normal text-foreground">
            {{ recipe.title }}
          </h3>
          <LinkIcon
            v-if="recipe.source_url"
            class="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-label="Importada de uma URL"
          />
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <Utensils class="h-3.5 w-3.5" />
            {{ ingredientLabel }}
          </span>
          <span v-if="createdLabel" class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5" />
            {{ createdLabel }}
          </span>
        </div>
        <div v-if="recipe.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="tag in recipe.tags.slice(0, 3)"
            :key="tag"
            class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/80"
          >
            {{ tag }}
          </span>
          <span v-if="recipe.tags?.length > 3" class="px-1 py-0.5 text-xs text-muted-foreground">
            +{{ recipe.tags?.length - 3 }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Grid layout (default): vertical card with a solid tone tile -->
    <Card
      v-else
      class="flex h-full flex-col overflow-hidden transition-[border-color,box-shadow] duration-150 group-hover:border-primary group-hover:shadow-md"
    >
      <div :class="['relative flex h-28 items-end justify-between px-4 pb-3.5', toneClass]">
        <span class="font-display text-6xl leading-[0.8] font-extrabold" aria-hidden="true">
          {{ initial }}
        </span>
        <span
          v-if="recipe.source_url"
          class="flex items-center gap-1 font-mono text-xs font-medium"
          title="Importada de uma URL"
        >
          <LinkIcon class="h-3.5 w-3.5" aria-hidden="true" />
          link
        </span>
      </div>

      <CardHeader class="pb-2">
        <CardTitle class="line-clamp-2 font-display text-xl leading-tight">
          {{ recipe.title }}
        </CardTitle>
      </CardHeader>

      <CardContent class="flex-grow pt-0 pb-4">
        <div class="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
          <div class="flex items-center gap-1">
            <Utensils class="h-3.5 w-3.5" />
            <span>{{ ingredientLabel }}</span>
          </div>
          <div v-if="createdLabel" class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5" />
            <span>{{ createdLabel }}</span>
          </div>
        </div>

        <p v-if="ingredientPreview" class="mb-3 line-clamp-1 text-sm text-muted-foreground">
          {{ ingredientPreview }}
        </p>

        <div v-if="recipe.tags?.length" class="mt-auto flex flex-wrap gap-1.5">
          <span
            v-for="tag in recipe.tags.slice(0, 3)"
            :key="tag"
            class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/80"
          >
            {{ tag }}
          </span>
          <span v-if="recipe.tags?.length > 3" class="px-1 py-0.5 text-xs text-muted-foreground">
            +{{ recipe.tags?.length - 3 }}
          </span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
