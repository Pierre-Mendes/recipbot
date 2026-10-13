<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Camera, Loader2, Trash2, Check, Type } from 'lucide-vue-next'

import type { RecipeCover, RecipeImageChange } from '@/types'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  RECIPE_COVERS,
  coverUrl,
  prepareImageForUpload,
} from '@/utils/covers'
import RecipeCoverArt from './RecipeCoverArt.vue'

/**
 * Picks how a recipe looks: a photo (camera or gallery) or one of the
 * built-in illustrations. The photo is only *collected* here - the parent
 * uploads it after the recipe is saved.
 */
const props = defineProps<{
  title: string
  /** Photo already stored for the recipe, if any. */
  currentImageUrl?: string | null
}>()

const cover = defineModel<RecipeCover | null>('cover', { default: null })
const image = defineModel<RecipeImageChange>('image', {
  default: () => ({ file: null, remove: false }),
})

const fileInput = ref<HTMLInputElement | null>(null)
const preparing = ref(false)
const error = ref<string | null>(null)
const previewUrl = ref<string | null>(null)

function revokePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

watch(
  () => image.value.file,
  (file) => {
    revokePreview()
    if (file) previewUrl.value = URL.createObjectURL(file)
  },
  { immediate: true },
)
onBeforeUnmount(revokePreview)

const shownImageUrl = computed(() => {
  if (previewUrl.value) return previewUrl.value
  if (props.currentImageUrl && !image.value.remove) return props.currentImageUrl
  return null
})

const hasPhoto = computed(() => shownImageUrl.value !== null)

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0]
  input.value = ''
  if (!picked) return

  error.value = null
  if (!ACCEPTED_IMAGE_TYPES.includes(picked.type)) {
    error.value = 'Use uma foto JPG, PNG ou WebP.'
    return
  }

  preparing.value = true
  try {
    const file = await prepareImageForUpload(picked)
    if (file.size > MAX_IMAGE_BYTES) {
      error.value = 'A foto passa de 5 MB. Escolha uma menor.'
      return
    }
    image.value = { file, remove: false }
  } finally {
    preparing.value = false
  }
}

function removePhoto() {
  error.value = null
  image.value = { file: null, remove: props.currentImageUrl != null }
}

/** Picking an illustration means "no photo": drop a pending/stored one. */
function selectCover(value: RecipeCover | null) {
  cover.value = value
  if (hasPhoto.value) removePhoto()
}
</script>

<template>
  <div class="space-y-3">
    <span class="text-sm font-medium leading-none text-foreground">Capa</span>

    <div
      class="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border sm:aspect-[5/2]"
    >
      <RecipeCoverArt :title="title || 'Receita'" :image-url="shownImageUrl" :cover="cover" />
      <div
        v-if="preparing"
        class="absolute inset-0 flex items-center justify-center bg-background/70"
        role="status"
      >
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
        <span class="sr-only">Preparando a foto…</span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPTED_IMAGE_TYPES.join(',')"
        class="sr-only"
        aria-label="Escolher foto da receita"
        data-testid="cover-file-input"
        @change="onFileChange"
      />
      <button
        type="button"
        class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:flex-none"
        :disabled="preparing"
        @click="fileInput?.click()"
      >
        <Camera class="h-4 w-4" />
        {{ hasPhoto ? 'Trocar foto' : 'Adicionar foto' }}
      </button>
      <button
        v-if="hasPhoto"
        type="button"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        @click="removePhoto"
      >
        <Trash2 class="h-4 w-4" />
        Remover foto
      </button>
    </div>

    <p v-if="error" class="text-sm font-medium text-destructive" role="alert">{{ error }}</p>

    <div>
      <p class="mb-2 text-sm text-muted-foreground">Ou escolha uma ilustração:</p>
      <div
        class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
        role="radiogroup"
        aria-label="Ilustração de capa"
      >
        <button
          type="button"
          role="radio"
          :aria-checked="!hasPhoto && cover === null"
          class="relative flex h-16 w-24 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-md border-2 bg-muted text-xs font-semibold text-muted-foreground transition-colors sm:w-auto"
          :class="
            !hasPhoto && cover === null
              ? 'border-primary'
              : 'border-transparent hover:border-border'
          "
          @click="selectCover(null)"
        >
          <Type class="h-4 w-4" />
          Inicial
        </button>
        <button
          v-for="option in RECIPE_COVERS"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="!hasPhoto && cover === option.value"
          :aria-label="option.label"
          :title="option.label"
          class="relative h-16 w-24 shrink-0 snap-start overflow-hidden rounded-md border-2 transition-colors sm:w-auto"
          :class="
            !hasPhoto && cover === option.value
              ? 'border-primary'
              : 'border-transparent hover:border-border'
          "
          @click="selectCover(option.value)"
        >
          <img :src="coverUrl(option.value)" alt="" class="h-full w-full object-cover" />
          <span
            v-if="!hasPhoto && cover === option.value"
            class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check class="h-3 w-3" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
