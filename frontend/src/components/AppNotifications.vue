<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
    <div
      v-for="notification in ui.notifications"
      :key="notification.id"
      class="pointer-events-auto rounded border px-3 py-2 text-sm shadow"
      :class="
        notification.level === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-gray-200 bg-white text-gray-800'
      "
      role="status"
    >
      <div class="flex items-start justify-between gap-2">
        <p>{{ notification.message }}</p>
        <button
          type="button"
          class="text-xs text-gray-500 hover:text-gray-700"
          @click="ui.removeNotification(notification.id)"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
