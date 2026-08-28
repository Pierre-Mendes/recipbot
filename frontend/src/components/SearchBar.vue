<script setup lang="ts">
import { ref } from 'vue'

import type { TagCount } from '@/types'

const props = defineProps<{ availableTags: TagCount[] }>()
const emit = defineEmits<{ search: [query: string, tags: string[]] }>()

const query = ref('')
const selectedTags = ref<string[]>([])

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((t) => t !== tag)
    : [...selectedTags.value, tag]
  emit('search', query.value, selectedTags.value)
}

function handleSubmit() {
  emit('search', query.value, selectedTags.value)
}
</script>

<template>
  <div class="mb-4">
    <form class="flex gap-2" @submit.prevent="handleSubmit">
      <input
        v-model="query"
        type="search"
        placeholder="Search by title or ingredient..."
        class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <button type="submit" class="rounded bg-purple-600 px-4 py-2 text-sm text-white">
        Search
      </button>
    </form>
    <div v-if="props.availableTags.length" class="mt-2 flex flex-wrap gap-1">
      <button
        v-for="tag in props.availableTags"
        :key="tag.name"
        type="button"
        class="rounded-full px-2 py-0.5 text-xs"
        :class="
          selectedTags.includes(tag.name)
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        "
        @click="toggleTag(tag.name)"
      >
        {{ tag.name }} ({{ tag.count }})
      </button>
    </div>
  </div>
</template>
