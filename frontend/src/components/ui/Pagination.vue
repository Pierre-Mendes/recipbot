<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { PaginationMeta } from '@/types'
import Button from './Button.vue'

defineProps<{
  meta: PaginationMeta
}>()

const emit = defineEmits<{
  'page-change': [page: number]
}>()
</script>

<template>
  <div v-if="meta.last_page > 1" class="flex items-center justify-center gap-4 pt-8">
    <Button
      variant="outline"
      size="sm"
      :disabled="meta.current_page <= 1"
      @click="emit('page-change', meta.current_page - 1)"
    >
      <ChevronLeft class="h-4 w-4 mr-1" />
      Anterior
    </Button>

    <span class="text-sm text-muted-foreground tabular-nums">
      Página <span class="font-semibold text-foreground">{{ meta.current_page }}</span> de
      <span class="font-semibold text-foreground">{{ meta.last_page }}</span>
      <span class="hidden sm:inline ml-1">({{ meta.total }} receitas)</span>
    </span>

    <Button
      variant="outline"
      size="sm"
      :disabled="meta.current_page >= meta.last_page"
      @click="emit('page-change', meta.current_page + 1)"
    >
      Próxima
      <ChevronRight class="h-4 w-4 ml-1" />
    </Button>
  </div>
</template>
