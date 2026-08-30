<script setup lang="ts">
import { computed, ref } from 'vue'

import type { TagCount } from '@/types'

const props = defineProps<{ availableTags: TagCount[] }>()
const emit = defineEmits<{ search: [query: string, tags: string[]] }>()

const query = ref('')
const selectedTags = ref<string[]>([])

const hasActiveFilters = computed(() => query.value.trim() !== '' || selectedTags.value.length > 0)

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((t) => t !== tag)
    : [...selectedTags.value, tag]
  emit('search', query.value, selectedTags.value)
}

function handleSubmit() {
  emit('search', query.value, selectedTags.value)
}

function clearFilters() {
  query.value = ''
  selectedTags.value = []
  emit('search', '', [])
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
      <button
        v-if="hasActiveFilters"
        type="button"
        class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
        @click="clearFilters"
      >
        Clear
      </button>
    </form>
    <p v-if="hasActiveFilters" class="mt-2 text-xs text-gray-500">
      Active filters:
      <span v-if="query.trim()">
        query "<strong>{{ query.trim() }}</strong
        >"
      </span>
      <span v-if="selectedTags.length">
        <span v-if="query.trim()"> + </span>{{ selectedTags.length }} tag(s)
      </span>
    </p>
    <div v-if="props.availableTags.length" class="mt-2 flex flex-wrap gap-1">
      <button
        v-for="tag in props.availableTags"
        :key="tag.name"
        type="button"
        :aria-pressed="selectedTags.includes(tag.name)"
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
