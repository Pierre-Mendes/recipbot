<script setup lang="ts">
import { ref } from 'vue'

import type { FromUrlInput, Recipe, RecipeFormInput } from '@/types'

const props = withDefaults(
  defineProps<{
    recipe?: Recipe | null
    loading?: boolean
  }>(),
  { recipe: null, loading: false },
)

const emit = defineEmits<{
  submit: [input: RecipeFormInput]
  submitFromUrl: [input: FromUrlInput]
}>()

const mode = ref<'manual' | 'url'>('manual')

const title = ref(props.recipe?.title ?? '')
const ingredientsText = ref(props.recipe?.ingredients.join('\n') ?? '')
const tagsText = ref(props.recipe?.tags.join(', ') ?? '')
const sourceUrl = ref(props.recipe?.source_url ?? '')

const importUrl = ref('')
const importTagsText = ref('')

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function handleManualSubmit() {
  emit('submit', {
    title: title.value,
    ingredients: parseLines(ingredientsText.value),
    tags: parseTags(tagsText.value),
    source_url: sourceUrl.value || null,
  })
}

function handleUrlSubmit() {
  emit('submitFromUrl', {
    url: importUrl.value,
    tags: parseTags(importTagsText.value),
  })
}
</script>

<template>
  <div>
    <div v-if="!props.recipe" class="mb-4 flex gap-2 border-b border-gray-200">
      <button
        type="button"
        class="px-3 py-2 text-sm"
        :class="mode === 'manual' ? 'border-b-2 border-purple-600 font-medium' : 'text-gray-500'"
        @click="mode = 'manual'"
      >
        Manual entry
      </button>
      <button
        type="button"
        class="px-3 py-2 text-sm"
        :class="mode === 'url' ? 'border-b-2 border-purple-600 font-medium' : 'text-gray-500'"
        @click="mode = 'url'"
      >
        Import from URL
      </button>
    </div>

    <form v-if="mode === 'manual'" class="space-y-4" @submit.prevent="handleManualSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="title">Title</label>
        <input
          id="title"
          v-model="title"
          type="text"
          required
          minlength="3"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="ingredients"
          >Ingredients (one per line)</label
        >
        <textarea
          id="ingredients"
          v-model="ingredientsText"
          required
          rows="6"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="tags"
          >Tags (comma separated)</label
        >
        <input
          id="tags"
          v-model="tagsText"
          type="text"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        :disabled="props.loading"
        class="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {{ props.recipe ? 'Save changes' : 'Create recipe' }}
      </button>
    </form>

    <form v-else class="space-y-4" @submit.prevent="handleUrlSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="url">Recipe URL</label>
        <input
          id="url"
          v-model="importUrl"
          type="url"
          required
          placeholder="https://www.tudogostoso.com.br/receita/..."
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        <p class="mt-1 text-xs text-gray-500">
          Supports tudogostoso.com.br, cybercook.com.br, and receitas.globo.com
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="import-tags"
          >Tags (comma separated)</label
        >
        <input
          id="import-tags"
          v-model="importTagsText"
          type="text"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        :disabled="props.loading"
        class="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
      >
        Import recipe
      </button>
    </form>
  </div>
</template>
