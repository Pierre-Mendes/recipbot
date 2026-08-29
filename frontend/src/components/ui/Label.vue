<script setup lang="ts">
import { cn } from '@/utils/cn'

const props = defineProps<{
  class?: any
  for?: string
}>()
</script>

<template>
  <label
    :for="props.for"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class
      )
    "
  >
    <slot />
  </label>
</template>
