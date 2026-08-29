<script setup lang="ts">
import { cn } from '@/utils/cn'

const props = defineProps<{
  class?: any
}>()
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-muted', props.class)" />
</template>
