<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { RecipeCover } from '@/types'
import { coverUrl } from '@/utils/covers'
import { recipeTone, titleInitial, type RecipeTone } from '@/utils/format'

/**
 * The visual of a recipe, in order of preference: the uploaded photo, the
 * chosen built-in illustration, or the title monogram on its tone tile.
 * Fills its container - the parent sets the size and the corner radius.
 */
const props = withDefaults(
  defineProps<{
    title: string
    imageUrl?: string | null
    cover?: RecipeCover | null
    /** Monogram size, for the fallback tile. */
    initialClass?: string
    /** Eager-load above-the-fold images (detail hero). */
    eager?: boolean
    /** Center the monogram (small square thumbnails) instead of bottom-left. */
    compact?: boolean
  }>(),
  { imageUrl: null, cover: null, initialClass: 'text-6xl', eager: false, compact: false },
)

/** Static class names per tone so Tailwind can see them at build time. */
const TONE_CLASSES: Record<RecipeTone, string> = {
  basil: 'bg-tone-basil text-tone-basil-foreground',
  paprika: 'bg-tone-paprika text-tone-paprika-foreground',
  saffron: 'bg-tone-saffron text-tone-saffron-foreground',
  flour: 'bg-tone-flour text-tone-flour-foreground',
}

// A photo that fails to load (deleted object, MinIO offline) falls back to
// the illustration/monogram instead of a broken-image icon.
const photoFailed = ref(false)
watch(
  () => props.imageUrl,
  () => {
    photoFailed.value = false
  },
)

const src = computed(() => {
  if (props.imageUrl && !photoFailed.value) return props.imageUrl
  if (props.cover) return coverUrl(props.cover)
  return null
})
</script>

<template>
  <img
    v-if="src"
    :src="src"
    alt=""
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    class="h-full w-full object-cover"
    @error="photoFailed = true"
  />
  <div
    v-else
    :class="[
      'flex h-full w-full font-display leading-[0.8] font-extrabold',
      compact ? 'items-center justify-center' : 'items-end px-4 pb-3.5',
      TONE_CLASSES[recipeTone(title)],
      initialClass,
    ]"
    aria-hidden="true"
  >
    {{ titleInitial(title) }}
  </div>
</template>
