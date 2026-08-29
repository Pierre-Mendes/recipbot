<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'

import type { TagCount } from '@/types'
import Input from './ui/Input.vue'
import Button from './ui/Button.vue'

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
  <div class="mb-6 space-y-4">
    <form class="flex gap-3" @submit.prevent="handleSubmit">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="query"
          type="search"
          placeholder="Buscar por título ou ingrediente..."
          class="pl-9 h-11 bg-background/50 backdrop-blur-sm"
        />
      </div>
      <Button type="submit" size="default" class="h-11 px-6 shadow-sm">
        Buscar
      </Button>
    </form>
    
    <div v-if="props.availableTags.length" class="flex flex-wrap gap-2">
      <button
        v-for="tag in props.availableTags"
        :key="tag.name"
        type="button"
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
        :class="
          selectedTags.includes(tag.name)
            ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm'
            : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
        "
        @click="toggleTag(tag.name)"
      >
        {{ tag.name }}
        <span 
          class="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]"
          :class="selectedTags.includes(tag.name) ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'"
        >
          {{ tag.count }}
        </span>
      </button>
    </div>
  </div>
</template>
